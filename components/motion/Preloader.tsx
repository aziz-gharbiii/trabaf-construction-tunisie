'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Écran d'intro (accueil uniquement, une fois par session) :
 * compteur 0 → 100 pendant que la scène 3D se prépare, puis rideau qui remonte.
 * Ne bloque jamais plus de 4 s.
 */
export function Preloader() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (pathname !== '/') return;
    let seen = false;
    try {
      seen = sessionStorage.getItem('trabaf_intro') === '1';
    } catch {}
    if (seen) return;

    setShow(true);
    let ready = false;
    const onReady = () => (ready = true);
    window.addEventListener('trabaf:scene-ready', onReady);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      // avance vite jusqu'à 85 %, puis attend la scène (max 4 s)
      const target = ready || elapsed > 4000 ? 100 : Math.min(85, (elapsed / 1400) * 85);
      setCount((c) => {
        const next = c + (target - c) * 0.12;
        return target === 100 && 100 - next < 0.6 ? 100 : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('trabaf:scene-ready', onReady);
    };
  }, [pathname]);

  useEffect(() => {
    if (show && count >= 100) {
      const t = setTimeout(() => {
        setShow(false);
        try {
          sessionStorage.setItem('trabaf_intro', '1');
        } catch {}
      }, 250);
      return () => clearTimeout(t);
    }
  }, [count, show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="preloader"
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex flex-col justify-between bg-[#050d1c] p-6 text-white sm:p-10"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            <span>TRABAF Construction</span>
            <span>Tunisie</span>
          </div>
          <div>
            <div className="font-display overflow-hidden text-[18vw] font-extrabold uppercase leading-[0.8] tracking-tight sm:text-[12vw]">
              <motion.div initial={{ y: '100%' }} animate={{ y: '0%' }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
                Trabaf<span className="text-[#F5B800]">.</span>
              </motion.div>
            </div>
            <div className="mt-6 flex items-end justify-between gap-6">
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#F5B800]" style={{ width: `${count}%` }} />
              </div>
              <span className="font-mono text-4xl font-bold tabular-nums sm:text-6xl">{Math.round(count)}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
