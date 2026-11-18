import { VisitorLog } from '@/types';
import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';

/**
 * Statistiques de visites, respectueuses de la vie privée :
 * - aucune adresse IP n'est enregistrée ;
 * - chaque navigateur reçoit un identifiant anonyme aléatoire (pour compter les visiteurs uniques) ;
 * - ville / pays approximatifs si le service de géolocalisation répond, sinon rien (jamais de valeur inventée).
 * Avec Supabase : visites enregistrées en base (visibles par l'admin). Sans : uniquement dans ce navigateur.
 */

const VISITOR_STORAGE_KEY = 'trabaf_visitor_logs_v1';
const VISITOR_ID_KEY = 'trabaf_visitor_id';
const GEO_KEY = 'trabaf_geo_v2';

interface GeoInfo {
  city?: string;
  country?: string;
}

let geoPromise: Promise<GeoInfo> | null = null;

function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'Tablette';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) return 'Mobile';
  return 'Ordinateur';
}

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anonyme';
  }
}

/** Ville / pays approximatifs (l'IP n'est jamais conservée). Champs vides si indisponible. */
export async function getVisitorIpInfo(): Promise<GeoInfo> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = sessionStorage.getItem(GEO_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  if (!geoPromise) {
    geoPromise = fetch('https://ipapi.co/json/', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const info: GeoInfo = d ? { city: d.city || undefined, country: d.country_name || undefined } : {};
        try {
          sessionStorage.setItem(GEO_KEY, JSON.stringify(info));
        } catch {}
        return info;
      })
      .catch(() => ({}));
  }
  return geoPromise;
}

function getLocalLogs(): VisitorLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(VISITOR_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/** Enregistre une page vue (pages publiques uniquement). */
export async function trackVisit(pagePath: string): Promise<void> {
  if (typeof window === 'undefined' || pagePath.startsWith('/admin')) return;
  try {
    const geo = await getVisitorIpInfo();
    const userAgent = navigator.userAgent || '';
    const row = {
      visitor_id: visitorId(),
      page: pagePath.slice(0, 200),
      city: geo.city?.slice(0, 100) ?? null,
      country: geo.country?.slice(0, 100) ?? null,
      device: detectDevice(userAgent)
    };
    const sb = getSupabase();
    if (sb) {
      await sb.from('visits').insert(row);
      return;
    }
    const log: VisitorLog = {
      id: crypto.randomUUID(),
      ip: `Visiteur ${row.visitor_id.slice(0, 6)}`,
      city: row.city ?? undefined,
      country: row.country ?? undefined,
      device: row.device,
      page: row.page,
      timestamp: new Date().toISOString(),
      user_agent: userAgent
    };
    localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify([log, ...getLocalLogs()].slice(0, 200)));
  } catch (err) {
    console.error('Suivi de visite impossible :', err);
  }
}

export type VisitorStats = {
  totalVisits: number;
  uniqueIpCount: number;
  uniqueIps: string[];
  recentVisitors: VisitorLog[];
};

/** Statistiques des 30 derniers jours (admin). */
export async function getVisitorStats(): Promise<VisitorStats> {
  let logs: VisitorLog[] = getLocalLogs();
  const sb = supabaseConfigured ? getSupabase() : null;
  if (sb) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await sb
      .from('visits')
      .select('id,visitor_id,page,city,country,device,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (!error && data) {
      logs = data.map((v) => ({
        id: String(v.id),
        ip: `Visiteur ${String(v.visitor_id).slice(0, 6)}`,
        city: v.city ?? undefined,
        country: v.country ?? undefined,
        device: v.device ?? undefined,
        page: v.page,
        timestamp: v.created_at
      }));
    }
  }
  const uniqueIps = Array.from(new Set(logs.map((l) => l.ip)));
  return { totalVisits: logs.length, uniqueIpCount: uniqueIps.length, uniqueIps, recentVisitors: logs.slice(0, 20) };
}

export async function clearVisitorLogs(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VISITOR_STORAGE_KEY);
  const sb = supabaseConfigured ? getSupabase() : null;
  if (sb) await sb.from('visits').delete().gte('id', 0);
}
