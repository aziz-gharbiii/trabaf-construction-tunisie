import React, { Suspense } from 'react';
import { ProjectLiveView } from '@/components/public/ProjectLiveView';

export const metadata = {
  title: 'Projet | TRABAF Construction Tunisie'
};

export default function ProjectViewPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ProjectLiveView />
      </Suspense>
    </div>
  );
}
