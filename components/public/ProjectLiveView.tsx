'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useProjects } from '@/lib/hooks';
import { syncPublic } from '@/lib/data-service';
import { ProjectDetailView } from '@/components/public/ProjectDetailView';

/** Fiche projet lue en direct (fonctionne aussi pour les projets ajoutés dans l'admin après la mise en ligne). */
export function ProjectLiveView() {
  const slug = useSearchParams().get('slug') ?? '';
  const projects = useProjects(true);
  const project = projects.find((p) => p.slug === slug);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    syncPublic().finally(() => setSynced(true));
  }, []);

  useEffect(() => {
    if (project) document.title = `${project.title} | TRABAF Construction Tunisie`;
  }, [project]);

  if (project) return <ProjectDetailView project={project} />;

  if (!synced) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center text-white">
      <h1 className="font-display text-3xl font-extrabold uppercase">Projet introuvable</h1>
      <p className="text-slate-400">Ce projet n&apos;existe pas ou n&apos;est plus publié.</p>
      <Link href="/projets" className="rounded-full bg-[#F5B800] px-6 py-3 text-sm font-extrabold uppercase text-[#050d1c]">
        Voir toutes les réalisations
      </Link>
    </div>
  );
}
