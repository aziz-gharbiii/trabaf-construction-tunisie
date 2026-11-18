import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { WhatsAppFloat } from '@/components/home/Sections';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { Preloader } from '@/components/motion/Preloader';
import { SiteDataProvider } from '@/components/providers/SiteDataProvider';
import { getSiteData } from '@/lib/build-data';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const data = await getSiteData();
  return (
    <SiteDataProvider data={data}>
    <div className="flex min-h-screen flex-col bg-[#050d1c] text-slate-100 selection:bg-[#F5B800] selection:text-[#050d1c]">
      <MotionProvider>
        <SmoothScroll />
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        <WhatsAppFloat />
        <Preloader />
      </MotionProvider>
      <div className="grain" aria-hidden="true" />
    </div>
    </SiteDataProvider>
  );
}
