import { Project, Service, Message, CompanySettings } from '@/types';
import { initialCompanySettings, initialProjects, initialServices, initialMessages } from './mock-data';
import { Remote, remoteEnabled } from './remote';

/**
 * Données du site.
 * - Lecture synchrone depuis un cache local (localStorage) → les pages admin restent simples.
 * - Avec Supabase configuré : chaque écriture admin est envoyée à la base, et syncPublic()/syncAdmin()
 *   remplissent le cache avec les vraies données. Les messages des visiteurs vont directement en base.
 * - Sans Supabase (mode démo / dev local) : tout reste dans le navigateur.
 */

const STORAGE_KEYS = {
  PROJECTS: 'trabaf_projects_v1',
  SERVICES: 'trabaf_services_v1',
  MESSAGES: 'trabaf_messages_v1',
  SETTINGS: 'trabaf_settings_v1',
  ADMIN_AUTH: 'trabaf_admin_authed_v1'
};

function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorageItem<T>(key: string, value: T, notify = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (notify) window.dispatchEvent(new Event('trabaf_storage_updated'));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

const newId = (prefix: string) =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function mergeSettings(stored: Partial<CompanySettings> | undefined): CompanySettings {
  return {
    ...initialCompanySettings,
    ...(stored ?? {}),
    partners: stored?.partners ?? initialCompanySettings.partners,
    stats: stored?.stats ?? initialCompanySettings.stats
  };
}

/* ---------------- Synchronisation avec Supabase ---------------- */
let publicSync: Promise<void> | null = null;

/** Charge les données publiques depuis Supabase (une fois par chargement de page). */
export function syncPublic(): Promise<void> {
  if (!remoteEnabled || typeof window === 'undefined') return Promise.resolve();
  if (!publicSync) {
    publicSync = Remote.fetchPublic()
      .then((d) => {
        if (d.settings) setStorageItem(STORAGE_KEYS.SETTINGS, mergeSettings(d.settings), false);
        if (d.services) setStorageItem(STORAGE_KEYS.SERVICES, d.services, false);
        if (d.projects) setStorageItem(STORAGE_KEYS.PROJECTS, d.projects, false);
        window.dispatchEvent(new Event('trabaf_storage_updated'));
      })
      .catch((e) => console.error(e));
  }
  return publicSync;
}

/** Charge tout (y compris brouillons et messages) pour un admin connecté. */
export async function syncAdmin(): Promise<void> {
  if (!remoteEnabled) return;
  const [d, messages] = await Promise.all([Remote.fetchPublic(), Remote.fetchMessages()]);
  if (d.settings) setStorageItem(STORAGE_KEYS.SETTINGS, mergeSettings(d.settings), false);
  if (d.services) setStorageItem(STORAGE_KEYS.SERVICES, d.services, false);
  if (d.projects) setStorageItem(STORAGE_KEYS.PROJECTS, d.projects, false);
  if (messages) setStorageItem(STORAGE_KEYS.MESSAGES, messages, false);
  window.dispatchEvent(new Event('trabaf_storage_updated'));
}

export async function syncMessages(): Promise<void> {
  if (!remoteEnabled) return;
  const messages = await Remote.fetchMessages();
  if (messages) setStorageItem(STORAGE_KEYS.MESSAGES, messages);
}

/** Efface les messages du cache local (à la déconnexion admin). */
export function clearLocalCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  } catch {}
}

const slugify = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const DataService = {
  // Settings
  getCompanySettings(): CompanySettings {
    return mergeSettings(getStorageItem<Partial<CompanySettings>>(STORAGE_KEYS.SETTINGS, {}));
  },

  updateCompanySettings(settings: CompanySettings): CompanySettings {
    setStorageItem(STORAGE_KEYS.SETTINGS, settings);
    void Remote.saveSettings(settings);
    return settings;
  },

  // Services
  getServices(onlyActive = false): Service[] {
    const services = getStorageItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
    const sorted = [...services].sort((a, b) => a.display_order - b.display_order);
    return onlyActive ? sorted.filter((s) => s.is_active) : sorted;
  },

  getServiceBySlug(slug: string): Service | undefined {
    return this.getServices().find((s) => s.slug === slug);
  },

  saveService(service: Partial<Service>): Service {
    const services = this.getServices();
    let saved: Service;
    const idx = service.id ? services.findIndex((s) => s.id === service.id) : -1;
    if (idx !== -1) {
      saved = { ...services[idx], ...service } as Service;
      services[idx] = saved;
    } else {
      let slug = service.slug || slugify(service.title || 'service');
      if (services.some((s) => s.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
      saved = {
        id: newId('srv'),
        title: service.title || 'Nouveau Service',
        slug,
        description: service.description || '',
        icon_name: service.icon_name || 'Building2',
        image_url: service.image_url || '/images/hero_bg.png',
        display_order: service.display_order || services.length + 1,
        is_active: service.is_active ?? true,
        created_at: new Date().toISOString()
      };
      services.push(saved);
    }
    setStorageItem(STORAGE_KEYS.SERVICES, services);
    void Remote.upsertService(saved);
    return saved;
  },

  deleteService(id: string): void {
    setStorageItem(
      STORAGE_KEYS.SERVICES,
      this.getServices().filter((s) => s.id !== id)
    );
    void Remote.deleteService(id);
  },

  // Projects
  getProjects(onlyPublished = false): Project[] {
    const projects = getStorageItem<Project[]>(STORAGE_KEYS.PROJECTS, initialProjects);
    const sorted = [...projects].sort((a, b) => a.display_order - b.display_order);
    return onlyPublished ? sorted.filter((p) => p.is_published) : sorted;
  },

  getFeaturedProjects(): Project[] {
    return this.getProjects(true).filter((p) => p.is_featured);
  },

  getProjectBySlug(slug: string): Project | undefined {
    return this.getProjects().find((p) => p.slug === slug);
  },

  saveProject(project: Partial<Project>): Project {
    const projects = this.getProjects();
    let saved: Project;
    const idx = project.id ? projects.findIndex((p) => p.id === project.id) : -1;

    if (idx !== -1) {
      saved = { ...projects[idx], ...project } as Project;
      projects[idx] = saved;
    } else {
      let slug = project.slug || slugify(project.title || 'projet');
      if (projects.some((p) => p.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
      saved = {
        id: newId('proj'),
        title: project.title || 'Nouveau Projet',
        slug,
        short_desc: project.short_desc || '',
        full_desc: project.full_desc || '',
        category: project.category || 'Bâtiments',
        client: project.client || '',
        location_name: project.location_name || 'Tunis',
        city: project.city || 'Tunis',
        country: project.country || 'Tunisie',
        lat: project.lat || 36.8065,
        lng: project.lng || 10.1815,
        year: project.year || new Date().getFullYear().toString(),
        duration: project.duration || '',
        surface_area: project.surface_area || '',
        status: project.status || 'En cours',
        main_image_url: project.main_image_url || '/images/hero_bg.png',
        gallery_urls: project.gallery_urls || [project.main_image_url || '/images/hero_bg.png'],
        is_featured: project.is_featured ?? false,
        is_published: project.is_published ?? true,
        display_order: project.display_order || projects.length + 1,
        created_at: new Date().toISOString()
      };
      projects.push(saved);
    }
    setStorageItem(STORAGE_KEYS.PROJECTS, projects);
    void Remote.upsertProject(saved);
    return saved;
  },

  deleteProject(id: string): void {
    setStorageItem(
      STORAGE_KEYS.PROJECTS,
      this.getProjects().filter((p) => p.id !== id)
    );
    void Remote.deleteProject(id);
  },

  // Messages
  getMessages(): Message[] {
    const messages = getStorageItem<Message[]>(STORAGE_KEYS.MESSAGES, remoteEnabled ? [] : initialMessages);
    return [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Envoi d'un message ou d'une demande de devis par un visiteur.
   * Avec Supabase : enregistré en base (visible par l'admin sur tous les appareils). Lève une erreur en cas d'échec.
   */
  async submitMessage(msg: Omit<Message, 'id' | 'status' | 'created_at'>): Promise<Message> {
    const message: Message = {
      ...msg,
      id: newId('msg'),
      status: 'new',
      is_real: true,
      created_at: new Date().toISOString()
    };
    if (remoteEnabled) {
      await Remote.insertMessage(message);
    } else {
      const messages = this.getMessages();
      messages.unshift(message);
      setStorageItem(STORAGE_KEYS.MESSAGES, messages);
    }
    return message;
  },

  clearFakeMessages(): void {
    const messages = this.getMessages().filter((m) => m.is_real === true || !m.id.startsWith('msg-1'));
    setStorageItem(STORAGE_KEYS.MESSAGES, messages);
  },

  updateMessageStatus(id: string, status: Message['status']): void {
    const messages = this.getMessages();
    const idx = messages.findIndex((m) => m.id === id);
    if (idx !== -1) {
      messages[idx].status = status;
      setStorageItem(STORAGE_KEYS.MESSAGES, messages);
      void Remote.updateMessageStatus(id, status);
    }
  },

  deleteMessage(id: string): void {
    setStorageItem(
      STORAGE_KEYS.MESSAGES,
      this.getMessages().filter((m) => m.id !== id)
    );
    void Remote.deleteMessage(id);
  },

  // Session admin du mode démo (sans Supabase). Avec Supabase, voir AdminAuth.
  isAdminLoggedIn(): boolean {
    return getStorageItem<boolean>(STORAGE_KEYS.ADMIN_AUTH, false);
  },

  setAdminLoggedIn(authed: boolean): void {
    setStorageItem(STORAGE_KEYS.ADMIN_AUTH, authed);
  }
};
