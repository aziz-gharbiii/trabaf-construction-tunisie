import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';
import type { CompanySettings, Message, MessageStatus, Project, Service } from '@/types';

/**
 * Accès à la base Supabase.
 * - Lecture publique : réglages, services actifs, projets publiés.
 * - Écriture : réservée aux comptes de la table `admins` (règles RLS côté serveur).
 * - Messages : les visiteurs peuvent seulement en créer.
 * Toutes les fonctions sont sans effet si Supabase n'est pas configuré (mode démo).
 */

export const remoteEnabled = supabaseConfigured;

function reportError(action: string, error: unknown) {
  const msg = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  console.error(`[Supabase] ${action} :`, msg);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trabaf_sync_error', { detail: `${action} : ${msg}` }));
  }
}

const PROJECT_COLS =
  'id,title,slug,short_desc,full_desc,category,client,location_name,city,country,lat,lng,year,duration,surface_area,status,main_image_url,gallery_urls,is_featured,is_published,display_order,created_at';
const SERVICE_COLS = 'id,title,slug,description,icon_name,image_url,display_order,is_active,created_at';

export type PublicData = { settings?: CompanySettings; services?: Service[]; projects?: Project[] };
export type AdminData = PublicData & { messages?: Message[] };

export const Remote = {
  async fetchPublic(): Promise<PublicData> {
    const sb = getSupabase();
    if (!sb) return {};
    const [settings, services, projects] = await Promise.all([
      sb.from('company_settings').select('data').eq('id', 1).maybeSingle(),
      sb.from('services').select(SERVICE_COLS).order('display_order'),
      sb.from('projects').select(PROJECT_COLS).order('display_order')
    ]);
    const out: PublicData = {};
    if (settings.error) reportError('Lecture des réglages', settings.error);
    else if (settings.data?.data) out.settings = settings.data.data as CompanySettings;
    if (services.error) reportError('Lecture des services', services.error);
    else out.services = services.data as Service[];
    if (projects.error) reportError('Lecture des projets', projects.error);
    else out.projects = projects.data as Project[];
    return out;
  },

  async fetchMessages(): Promise<Message[] | undefined> {
    const sb = getSupabase();
    if (!sb) return undefined;
    const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) {
      reportError('Lecture des messages', error);
      return undefined;
    }
    return (data as Message[]).map((m) => ({ ...m, phone: m.phone ?? undefined }));
  },

  async saveSettings(settings: CompanySettings) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('company_settings').upsert({ id: 1, data: settings, updated_at: new Date().toISOString() });
    if (error) reportError('Enregistrement des réglages', error);
  },

  async upsertService(s: Service) {
    const sb = getSupabase();
    if (!sb) return;
    const { created_at: _c, ...row } = s;
    const { error } = await sb.from('services').upsert(row);
    if (error) reportError('Enregistrement du service', error);
  },

  async deleteService(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('services').delete().eq('id', id);
    if (error) reportError('Suppression du service', error);
  },

  async upsertProject(p: Project) {
    const sb = getSupabase();
    if (!sb) return;
    const { created_at: _c, ...row } = p;
    const { error } = await sb.from('projects').upsert(row);
    if (error) reportError('Enregistrement du projet', error);
  },

  async deleteProject(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('projects').delete().eq('id', id);
    if (error) reportError('Suppression du projet', error);
  },

  /** Envoi d'un message / devis par un visiteur. Lève une erreur si l'envoi échoue. */
  async insertMessage(m: Message): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    const { created_at: _c, ...row } = m;
    const { error } = await sb.from('messages').insert(row);
    if (error) {
      reportError('Envoi du message', error);
      throw error;
    }
  },

  async updateMessageStatus(id: string, status: MessageStatus) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('messages').update({ status }).eq('id', id);
    if (error) reportError('Mise à jour du message', error);
  },

  async deleteMessage(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('messages').delete().eq('id', id);
    if (error) reportError('Suppression du message', error);
  },

  /** Envoie une image dans le bucket public "media" et renvoie son URL publique. */
  async uploadImage(file: File): Promise<string> {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase n'est pas configuré : impossible d'envoyer des images.");
    if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Image trop lourde (10 Mo maximum).');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (error) {
      reportError("Envoi de l'image", error);
      throw error;
    }
    return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
  }
};

/* ---------------- Authentification admin ---------------- */
export const AdminAuth = {
  async signIn(email: string, password: string): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return "Supabase n'est pas configuré.";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message;
    if (!(await AdminAuth.isAdmin())) {
      await sb.auth.signOut();
      return "Ce compte n'a pas les droits administrateur.";
    }
    return null;
  },

  async signOut() {
    await getSupabase()?.auth.signOut();
  },

  async isAdmin(): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    const { data: session } = await sb.auth.getSession();
    if (!session.session) return false;
    const { data, error } = await sb.rpc('is_admin');
    return !error && data === true;
  },

  async email(): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session?.user.email ?? null;
  }
};
