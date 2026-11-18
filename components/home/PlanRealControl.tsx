'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { split, setSplit } from '@/components/three/splitStore';

/** Curseur « Plan ⟷ Réalisé » relié à la scène 3D du hero. */
export function PlanRealControl() {
  const input = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState(0);

  // suit l'animation automatique tant que le visiteur n'a pas pris la main
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setVal((v) => (Math.abs(v - split.value) > 0.002 ? split.value : v));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (v: number) => {
    setSplit(v);
    setVal(v);
  };

  const pct = Math.round(val * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.6 }}
      className="w-[min(92vw,360px)] rounded-2xl border border-white/15 bg-[#050d1c]/60 p-4 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em]">
        <button type="button" onClick={() => go(0)} className={`transition-colors ${pct < 50 ? 'text-[#7fb4ff]' : 'text-slate-400 hover:text-white'}`}>
          ◧ Plan
        </button>
        <span className="font-mono text-[10px] tracking-normal text-slate-400">Du plan à la réalité</span>
        <button type="button" onClick={() => go(1)} className={`transition-colors ${pct >= 50 ? 'text-[#F5B800]' : 'text-slate-400 hover:text-white'}`}>
          Réalisé ◨
        </button>
      </div>
      <div className="relative mt-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 my-auto h-1.5 w-full rounded-full bg-gradient-to-r from-[#3f86e8] via-[#9fbfe6] to-[#F5B800] opacity-80" />
        <input
          ref={input}
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => go(Number(e.target.value) / 100)}
          aria-label="Comparer le plan d'architecte et le bâtiment réalisé"
          className="plan-range relative z-10 w-full"
        />
      </div>
    </motion.div>
  );
}
