import React from 'react';
import { HeroV2 } from '@/components/home/HeroV2';
import {
  Marquee,
  IntroStats,
  ProcessSection,
  PoolSection,
  PartnersSection,
  FinalCta
} from '@/components/home/Sections';
import { ProjectsShowcase } from '@/components/home/ProjectsShowcase';
import { ServicesSlider } from '@/components/home/ServicesSlider';

export const metadata = {
  title: 'TRABAF Construction Tunisie | Bâtiment, Génie Civil & Piscines sur Mesure',
  description:
    'Entreprise de construction en Tunisie : bâtiments clés en main, villas, génie civil, travaux publics et piscines sur mesure. Devis gratuit en 60 secondes.'
};

export default function HomePage() {
  return (
    <>
      <HeroV2 />
      <Marquee />
      <IntroStats />
      <ServicesSlider />
      <ProcessSection />
      <ProjectsShowcase />
      <PoolSection />
      <PartnersSection />
      <FinalCta />
    </>
  );
}
