'use client';

import React, { createContext, useContext } from 'react';
import type { SiteData } from '@/lib/build-data';

const Ctx = createContext<SiteData | null>(null);

/** Transmet aux composants client les données lues au build (valeurs initiales identiques serveur/client). */
export function SiteDataProvider({ data, children }: { data: SiteData; children: React.ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useSiteData(): SiteData | null {
  return useContext(Ctx);
}
