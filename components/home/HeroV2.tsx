'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowDown, MessageCircle } from 'lucide-react';
import { useSettings, whatsappLink } from '@/lib/hooks';
import { Magnetic, useReducedMotion } from '@/components/motion/Reveal';
import { PlanRealControl } from '@/components/home/PlanRealControl';

const HeroScene = dynamic(() => import('@/components/three/PhotoHero'), {
  ssr: false,
  loading: () => <div className="hero-fallback absolute inset-0" />
});

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroV2() {
  const settings = useSettings();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 600], [0, -120]);
  const textOpacity = useTransform(scrollY, [0, 450], [1, 0]);

  const line = (delay: number) => ({
    initial: { y: '110%' },
    animate: { y: '0%' },
    transition: { duration: 1, delay, ease: EASE }
  });

  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-[#050d1c] text-white">
      <HeroScene />

      {/* Dégradés de lisibilité */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050d1c]/90 via-[#050d1c]/45 to-transparent md:via-[#050d1c]/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050d1c] to-transparent" />

      <motion.div
        style={reduce ? undefined : { y: textY, opacity: textOpacity }}
        className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-24 pt-28 sm:px-6 md:justify-center md:pb-16 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5B800] shadow-[0_0_12px_#F5B800]" />
          Du plan à la réalité — Tunisie
        </motion.div>

        <h1 className="font-display max-w-5xl text-[clamp(3rem,8vw,6.5rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.02em]">
          <span className="block overflow-hidden">
            <motion.span className="block" {...line(0.35)}>
              Bâtir
            </motion.span>
          </span>
          <span className="block overflow-hidden whitespace-nowrap">
            <motion.span className="block text-[#F5B800]" {...line(0.5)}>
              vos <span className="font-serif-accent text-[1.08em]">rêves.</span>
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
          className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg"
        >
          Immeubles, villas et piscines sur mesure en Tunisie. De votre plan d&apos;architecte jusqu&apos;à la
          remise des clés, une seule équipe d&apos;ingénieurs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
          className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Magnetic>
            <Link
              href="/devis"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#F5B800] px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-[#050d1c] shadow-[0_10px_40px_-10px_rgba(245,184,0,0.7)] transition-colors hover:bg-white"
            >
              Devis gratuit en 60 s
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <a
            href={whatsappLink(settings.whatsapp, 'Bonjour TRABAF, je souhaite des informations pour un projet.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-sm font-bold text-white backdrop-blur transition-colors hover:border-[#25D366] hover:text-[#25D366]"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp {settings.phone}
          </a>
        </motion.div>
      </motion.div>

      <div className="absolute right-4 top-24 z-20 md:bottom-28 md:right-8 md:top-auto">
        <PlanRealControl />
      </div>

      {/* Bandeau chiffres en bas du hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="absolute inset-x-0 bottom-0 z-10 hidden border-t border-white/10 bg-[#050d1c]/40 backdrop-blur-md md:block"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5 text-sm">
          <div className="flex gap-12">
            {settings.stats.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-white">
                  {s.prefix}
                  {s.value}
                  {s.suffix}
                </span>
                <span className="text-xs uppercase tracking-wider text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Défiler
            <ArrowDown className="h-4 w-4 animate-bounce text-[#F5B800]" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
