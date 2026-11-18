'use client';

import { useEffect, useState } from 'react';
import { DataService, syncPublic } from '@/lib/data-service';
import { remoteEnabled } from '@/lib/remote';
import { initialCompanySettings, initialProjects, initialServices } from '@/lib/mock-data';
import { useSiteData } from '@/components/providers/SiteDataProvider';
import type { CompanySettings, Partner, Project, Service } from '@/types';

/**
 * Hooks de lecture des données publiques.
 * 1er rendu = données lues au build (identiques au HTML statique → pas d'erreur d'hydratation).
 * Ensuite : avec Supabase, synchro en direct depuis la base ; sans Supabase, lecture du cache local (mode démo).
 * Se met à jour quand l'admin modifie quelque chose dans le même navigateur.
 */
function useStore<T>(read: () => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    let alive = true;
    const load = () => alive && setValue(read());
    if (remoteEnabled) {
      void syncPublic();
    } else {
      load();
    }
    window.addEventListener('trabaf_storage_updated', load);
    window.addEventListener('storage', load);
    return () => {
      alive = false;
      window.removeEventListener('trabaf_storage_updated', load);
      window.removeEventListener('storage', load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

export function useSettings(): CompanySettings {
  const data = useSiteData();
  return useStore(() => DataService.getCompanySettings(), data?.settings ?? initialCompanySettings);
}

export function usePartners(): Partner[] {
  const settings = useSettings();
  return (settings.partners ?? []).filter((p) => p.is_active).sort((a, b) => a.display_order - b.display_order);
}

export function useServices(onlyActive = true): Service[] {
  const data = useSiteData();
  const initial = data?.services ?? initialServices;
  return useStore(
    () => DataService.getServices(onlyActive),
    [...initial].filter((s) => !onlyActive || s.is_active).sort((a, b) => a.display_order - b.display_order)
  );
}

export function useProjects(onlyPublished = true): Project[] {
  const data = useSiteData();
  const initial = data?.projects ?? initialProjects;
  return useStore(
    () => DataService.getProjects(onlyPublished),
    [...initial].filter((p) => !onlyPublished || p.is_published).sort((a, b) => a.display_order - b.display_order)
  );
}

export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

/** Lien vers la fiche d'un projet (page client : marche aussi pour les projets ajoutés après le build). */
export function projectHref(slug: string): string {
  return `/projets/voir?slug=${encodeURIComponent(slug)}`;
}
