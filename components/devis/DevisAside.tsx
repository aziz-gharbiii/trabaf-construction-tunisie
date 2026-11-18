'use client';

import React from 'react';
import { Clock, FileCheck2, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useSettings, whatsappLink, telLink } from '@/lib/hooks';
import { SplitHeading, Reveal } from '@/components/motion/Reveal';

export function DevisAside() {
  const settings = useSettings();
  return (
    <div className="lg:sticky lg:top-32">
      <p className="eyebrow">Devis gratuit</p>
      <SplitHeading
        as="h1"
        text="Votre devis en 60 secondes."
        highlight={['60']}
        className="font-display mt-5 text-5xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl"
      />
      <Reveal delay={0.2}>
        <p className="mt-6 max-w-md text-slate-300">
          Trois questions, et un ingénieur TRABAF vous rappelle avec une première estimation. Sans engagement.
        </p>
      </Reveal>
      <Reveal delay={0.3}>
        <ul className="mt-8 space-y-4 text-sm text-slate-200">
          {[
            { icon: Clock, t: 'Rappel rapide par un ingénieur' },
            { icon: FileCheck2, t: 'Devis détaillé poste par poste' },
            { icon: ShieldCheck, t: 'Gratuit et sans engagement' }
          ].map(({ icon: Icon, t }) => (
            <li key={t} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5B800]/15 text-[#F5B800]">
                <Icon className="h-4 w-4" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.4}>
        <div className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-8">
          <a href={telLink(settings.phone)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold hover:border-[#F5B800]">
            <Phone className="h-4 w-4 text-[#F5B800]" />
            {settings.phone}
          </a>
          <a
            href={whatsappLink(settings.whatsapp, 'Bonjour TRABAF, je souhaite un devis.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold hover:border-[#25D366]"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            WhatsApp
          </a>
        </div>
      </Reveal>
    </div>
  );
}
