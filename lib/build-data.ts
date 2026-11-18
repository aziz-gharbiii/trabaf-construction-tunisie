import type { CompanySettings, Project, Service } from '@/types';
import { initialCompanySettings, initialProjects, initialServices } from './mock-data';
import { mergeSettings } from './data-service';

/**
 * Données lues AU MOMENT DU BUILD (côté serveur) pour générer un HTML déjà rempli
 * avec le vrai contenu (SEO + pas de "flash" de contenu de démo).
 * Ensuite, côté navigateur, syncPublic() met à jour en direct.
 */
export type SiteData = { settings: CompanySettings; services: Service[]; projects: Project[] };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const fallback: SiteData = {
  settings: initialCompanySettings,
  services: initialServices.filter((s) => s.is_active),
  projects: initialProjects.filter((p) => p.is_published)
};

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    // clé publiable : uniquement dans l'en-tête apikey
    headers: { apikey: key! },
    cache: 'force-cache'
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

let cached: Promise<SiteData> | null = null;

export function getSiteData(): Promise<SiteData> {
  if (!url || !key || url.includes('your-supabase')) return Promise.resolve(fallback);
  if (!cached) {
    cached = Promise.all([
      rest<{ data: CompanySettings }[]>('company_settings?select=data&id=eq.1'),
      rest<Service[]>('services?select=*&is_active=eq.true&order=display_order'),
      rest<Project[]>('projects?select=*&is_published=eq.true&order=display_order')
    ])
      .then(([s, services, projects]) => ({ settings: mergeSettings(s[0]?.data), services, projects }))
      .catch((e) => {
        console.warn('[build] Supabase indisponible, contenu par défaut utilisé :', e);
        return fallback;
      });
  }
  return cached;
}
