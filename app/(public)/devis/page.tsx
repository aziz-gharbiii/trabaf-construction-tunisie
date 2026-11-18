import React from 'react';
import { DevisWizard } from '@/components/devis/DevisWizard';
import { DevisAside } from '@/components/devis/DevisAside';

export const metadata = {
  title: 'Devis gratuit construction & piscine en Tunisie | TRABAF Construction',
  description:
    'Demandez un devis gratuit pour votre villa, immeuble, piscine sur mesure ou travaux de génie civil en Tunisie. Réponse rapide de nos ingénieurs.'
};

export default function DevisPage() {
  return (
    <section className="relative min-h-screen bg-[#050d1c] pb-24 pt-36 text-white">
      <div className="blueprint pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <DevisAside />
        </div>
        <div className="lg:col-span-7">
          <DevisWizard />
        </div>
      </div>
    </section>
  );
}
