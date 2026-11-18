'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useServices } from '@/lib/hooks';
import { getImagePath } from '@/lib/image-path';

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTOPLAY_MS = 6000;

// Mot géant affiché en fond selon le service
function bigWord(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('piscine')) return 'Piscines';
  if (t.includes('génie') || t.includes('genie')) return 'Génie civil';
  if (t.includes('travaux publics') || t.includes('voirie')) return 'VRD';
  if (t.includes('résidentiel') || t.includes('villa')) return 'Villas';
  if (t.includes('industri')) return 'Industrie';
  if (t.includes('rénovation')) return 'Rénovation';
  if (t.includes('étude')) return 'Études';
  return 'Bâtiment';
}

export function ServicesSlider() {
  const services = useServices(true).slice(0, 6);
  const n = services.length;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  const go = useCallback(
    (next: number) => {
      if (n === 0) return;
      const target = (next + n) % n;
      setDir(next > index || (index === n - 1 && target === 0) ? 1 : -1);
      setIndex(target);
      setProgressKey((k) => k + 1);
    },
    [index, n]
  );

  // Lecture auto uniquement quand la section est visible et non survolée
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!inView || paused || n < 2) return;
    const t = setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [inView, paused, index, n, go, progressKey]);

  if (n === 0) return null;
  const s = services[index];
  const word = bigWord(s.title);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#06101f] py-24 text-white sm:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
      aria-roledescription="carrousel"
      aria-label="Nos métiers"
    >
      {/* halo de couleur */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5B800]/10 blur-[120px]" />

      {/* Mot géant en fond */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none overflow-hidden" aria-hidden="true">
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={word}
            custom={dir}
            initial={{ x: `${dir * 30}%`, opacity: 0 }}
            animate={{ x: '0%', opacity: 1 }}
            exit={{ x: `${dir * -30}%`, opacity: 0 }}
            transition={{ duration: 1.1, ease: EASE }}
            className="font-display whitespace-nowrap text-center text-[22vw] font-extrabold uppercase leading-none tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.12)]"
          >
            {word}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Nos métiers</p>
            <h2 className="font-display mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Ce que nous <span className="font-serif-accent text-[#F5B800]">construisons</span>
            </h2>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <button onClick={() => go(index - 1)} aria-label="Service précédent" className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 transition-colors hover:border-[#F5B800] hover:text-[#F5B800]">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(index + 1)} aria-label="Service suivant" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5B800] text-[#050d1c] transition-colors hover:bg-white">
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-12">
          {/* Texte */}
          <div className="order-2 lg:order-1 lg:col-span-4">
            <div className="font-mono text-sm text-slate-400">
              <span className="text-[#F5B800]">{String(index + 1).padStart(2, '0')}</span> / {String(n).padStart(2, '0')}
            </div>
            <div className="relative mt-4 min-h-[260px]">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <h3 className="font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-4xl">{s.title}</h3>
                  <p className="mt-5 text-base leading-relaxed text-slate-300">{s.description}</p>
                  <Link
                    href={`/devis${s.slug.includes('piscine') ? '?type=piscine' : ''}`}
                    className="group mt-8 inline-flex items-center gap-3 rounded-full border border-white/20 px-6 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors hover:border-[#F5B800] hover:bg-[#F5B800] hover:text-[#050d1c]"
                  >
                    Demander un devis
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
            {/* barre de progression de l'autoplay */}
            <div className="mt-8 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                key={progressKey + (paused || !inView ? '-p' : '')}
                className="h-full bg-[#F5B800]"
                initial={{ width: '0%' }}
                animate={{ width: paused || !inView ? '0%' : '100%' }}
                transition={{ duration: paused || !inView ? 0 : AUTOPLAY_MS / 1000, ease: 'linear' }}
              />
            </div>
          </div>

          {/* Visuel central */}
          <div className="order-1 lg:order-2 lg:col-span-5" style={{ perspective: '1400px' }}>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
              <AnimatePresence mode="popLayout" custom={dir} initial={false}>
                <motion.div
                  key={s.id}
                  custom={dir}
                  initial={{ rotateY: dir * 55, x: `${dir * 40}%`, scale: 0.8, opacity: 0 }}
                  animate={{ rotateY: 0, x: '0%', scale: 1, opacity: 1 }}
                  exit={{ rotateY: dir * -55, x: `${dir * -40}%`, scale: 0.8, opacity: 0 }}
                  transition={{ duration: 1, ease: EASE }}
                  className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)]"
                >
                  <Image src={getImagePath(s.image_url || '/images/hero_bg.png')} alt={s.title} fill sizes="(max-width: 1024px) 90vw, 450px" className="object-cover" priority={index === 0} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050d1c]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 rounded-full bg-[#050d1c]/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#F5B800] backdrop-blur">
                    {word}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Vignettes */}
          <div className="order-3 lg:col-span-3">
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {services.map((sv, k) => (
                <button
                  key={sv.id}
                  onClick={() => go(k)}
                  aria-label={sv.title}
                  aria-current={k === index}
                  className={`group flex shrink-0 items-center gap-4 rounded-2xl border p-2.5 pr-4 text-left transition-all duration-500 ${
                    k === index ? 'border-[#F5B800]/60 bg-white/[0.06]' : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <Image src={getImagePath(sv.image_url || '/images/hero_bg.png')} alt="" fill sizes="56px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  </span>
                  <span className="hidden max-w-[11rem] text-xs font-bold uppercase leading-tight tracking-wide sm:block">{sv.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
