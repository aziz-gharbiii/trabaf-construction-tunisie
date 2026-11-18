import React from 'react';
import { notFound } from 'next/navigation';
import { getSiteData } from '@/lib/build-data';
import { ProjectDetailView } from '@/components/public/ProjectDetailView';

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const { projects } = await getSiteData();
  return projects.map((project) => ({
    slug: project.slug
  }));
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = (await getSiteData()).projects.find((p) => p.slug === slug);
  if (!project) return { title: 'Projet Non Trouvé | TRABAF Construction' };

  return {
    title: `${project.title} | TRABAF Construction Tunisie`,
    description: project.short_desc
  };
}

export default async function SingleProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = (await getSiteData()).projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      <ProjectDetailView project={project} />
    </div>
  );
}
