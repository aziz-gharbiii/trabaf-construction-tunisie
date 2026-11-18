'use client';

import React from 'react';
import { motion, useInView, animate } from 'framer-motion';

/**
 * Choix produit : les animations du site sont pilotées par le scroll (donc contrôlées par le visiteur)
 * et restent douces → elles sont gardées pour tout le monde. Seules les boucles automatiques
 * (bandeau défilant, pulsations) s'arrêtent via CSS quand le système demande moins d'animations.
 */
export function useReducedMotion(): boolean {
  return false;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Apparition au scroll (fade + slide), une seule fois. */
export function Reveal({
  children,
  delay = 0,
  y = 40,
  className
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Titre révélé mot par mot (masque). L'observation se fait sur le titre entier (les mots masqués ne sont pas "visibles"). */
export function SplitHeading({
  text,
  className,
  highlight = [],
  as = 'h2',
  delay = 0
}: {
  text: string;
  className?: string;
  highlight?: string[];
  as?: 'h1' | 'h2' | 'h3';
  delay?: number;
}) {
  const words = text.split(' ');
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ staggerChildren: 0.06, delayChildren: delay }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]" aria-hidden="true">
          <motion.span
            className={`inline-block ${highlight.includes(w.replace(/[.,!?]/g, '')) ? 'text-[#F5B800]' : ''}`}
            variants={{ hidden: { y: '110%' }, show: { y: '0%', transition: { duration: 0.85, ease: EASE } } }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Compteur animé quand il entre à l'écran. */
export function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) {
      ref.current.textContent = `${prefix}${value}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration: 1.8,
      ease: EASE,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`;
      }
    });
    return () => controls.stop();
  }, [inView, value, prefix, suffix, reduce]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

/** Bouton "magnétique" qui suit légèrement le curseur. */
export function Magnetic({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const onMove = (e: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0,0)';
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="inline-block transition-transform duration-300 ease-out">
      {children}
    </div>
  );
}
