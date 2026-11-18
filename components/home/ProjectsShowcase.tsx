'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, MotionValue, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useProjects, projectHref } from '@/lib/hooks';
import { getImagePath } from '@/lib/image-path';
import { useReducedMotion } from '@/components/motion/Reveal';
import type { Project } from '@/types';

/* Carte projet : rotation 3D type "coverflow" selon sa position + inclinaison à la souris */
function ProjectCard3D({ p, i, count, progress }: { p: Project; i: number; count: number; progress: MotionValue<number> | null }) {
  const center = count > 1 ? i / (count - 1) : 0;
  const step = count > 1 ? 1 / (count - 1) : 1;
  const fallback = useMotionValue(center);
  const src = progress ?? fallback;

  const rotateY = useTransform(src, [center - step, center, center + step], [-28, 0, 28]);
  const scale = useTransform(src, [center - step, center, center + step], [0.84, 1, 0.84]);
  const z = useTransform(src, [center - step, center, center + step], [-180, 0, -180]);
  const dim = useTransform(src, [center - step, center, center + step], [0.55, 0, 0.55]);

  // inclinaison souris (ressort)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 160, damping: 18 });
  const tiltY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 160, damping: 18 });
  const imgX = useSpring(useTransform(mx, [-0.5, 0.5], ['3%', '-3%']), { stiffness: 120, damping: 20 });
  const imgY = useSpring(useTransform(my, [-0.5, 0.5], ['3%', '-3%']), { stiffness: 120, damping: 20 });
  const glareX = useTransform(mx, [-0.5, 0.5], ['0%', '100%']);
  const glare = useTransform(glareX, (gx) => `radial-gradient(circle at ${gx} 30%, rgba(255,255,255,0.18), transparent 55%)`);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const enCours = p.status === 'En cours';

  return (
    <motion.div style={{ rotateY, scale, z, transformStyle: 'preserve-3d' }} className="w-[var(--cw)] shrink-0">
      <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' }}>
        <Link
          href={projectHref(p.slug)}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="group relative block h-[54vh] overflow-hidden rounded-3xl bg-[#081833] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
        >
          <motion.div style={{ x: imgX, y: imgY }} className="absolute inset-[-5%]">
            <Image src={getImagePath(p.main_image_url)} alt={p.title} fill sizes="(max-width: 768px) 82vw, 58vw" className="object-cover" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050d1c] via-[#050d1c]/35 to-transparent" />
          <motion.div style={{ background: glare }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <motion.div style={{ opacity: dim }} className="pointer-events-none absolute inset-0 bg-[#050d1c]" />

          <div className="absolute left-6 top-6 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ transform: 'translateZ(40px)' }}>
            <span className="rounded-full bg-[#F5B800] px-3 py-1 text-[#050d1c]">{p.category}</span>
            {enCours ? (
              <span className="flex items-center gap-2 rounded-full bg-[#050d1c]/70 px-3 py-1 text-[#F5B800] backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5B800] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F5B800]" />
                </span>
                Chantier en cours
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1 text-white backdrop-blur">{p.status}</span>
            )}
          </div>

          <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-6 text-white sm:inset-x-10 sm:bottom-10" style={{ transform: 'translateZ(60px)' }}>
            <div>
              <div className="font-mono text-xs text-slate-300">
                {String(i + 1).padStart(2, '0')} — {p.year}
              </div>
              <h3 className="font-display mt-2 max-w-xl text-2xl font-extrabold uppercase leading-none tracking-tight sm:text-4xl">{p.title}</h3>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-[#F5B800]" />
                {p.location_name}
              </div>
              {enCours && <div className="hazard-move mt-4 h-1.5 w-48 rounded-full" />}
            </div>
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#050d1c] transition-transform duration-500 group-hover:rotate-45 sm:flex">
              <ArrowUpRight className="h-6 w-6" />
            </span>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function ProjectsShowcase() {
  const projects = useProjects(true).slice(0, 6);
  const n = projects.length;
  const target = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end end'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  // La carte i est centrée quand progress = i / (n - 1)
  const x = useTransform(smooth, (p) => `calc(${-p * Math.max(0, n - 1)} * (var(--cw) + 24px))`);

  const header = (
    <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-6 px-4 sm:px-6 lg:px-8">
      <div>
        <p className="eyebrow">Réalisations</p>
        <h2 className="font-display mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
          Nos <span className="text-[#F5B800]">chantiers.</span>
        </h2>
      </div>
      <Link href="/projets" className="group hidden items-center gap-2 text-sm font-bold uppercase tracking-wider text-white sm:inline-flex">
        Tout le portfolio
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );

  if (reduce) {
    return (
      <section ref={target} className="bg-[#050d1c] py-24 text-white [--cw:82vw] sm:[--cw:64vw] lg:[--cw:58vw]">
        {header}
        <div className="mt-12 flex snap-x gap-6 overflow-x-auto px-4 pb-6 sm:px-8">
          {projects.map((p, i) => (
            <div key={p.id} className="snap-start">
              <ProjectCard3D p={p} i={i} count={n} progress={null} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={target}
      className="relative bg-[#050d1c] text-white [--cw:82vw] sm:[--cw:64vw] lg:[--cw:52vw]"
      style={{ height: `${Math.max(2, n) * 75}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center gap-8 overflow-hidden pt-16">
        {header}
        <div style={{ perspective: '1600px' }}>
          <motion.div style={{ x, transformStyle: 'preserve-3d' }} className="flex gap-6 pl-[calc((100vw-var(--cw))/2)]">
            {projects.map((p, i) => (
              <ProjectCard3D key={p.id} p={p} i={i} count={n} progress={smooth} />
            ))}
          </motion.div>
        </div>
        {/* indicateur de progression */}
        <div className="mx-auto flex gap-2">
          {projects.map((p, i) => (
            <Dot key={p.id} i={i} n={n} progress={smooth} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Dot({ i, n, progress }: { i: number; n: number; progress: MotionValue<number> }) {
  const c = n > 1 ? i / (n - 1) : 0;
  const s = n > 1 ? 1 / (n - 1) : 1;
  const width = useTransform(progress, [c - s, c, c + s], [8, 32, 8]);
  const bg = useTransform(progress, [c - s, c, c + s], ['#ffffff33', '#F5B800', '#ffffff33']);
  return <motion.span style={{ width, backgroundColor: bg }} className="h-2 rounded-full" />;
}
