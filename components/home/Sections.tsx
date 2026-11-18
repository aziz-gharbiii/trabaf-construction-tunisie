'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Phone, MessageCircle, Check } from 'lucide-react';
import { useProjects, useServices, useSettings, usePartners, whatsappLink, telLink } from '@/lib/hooks';
import { getImagePath } from '@/lib/image-path';
import { Reveal, SplitHeading, CountUp, Magnetic, useReducedMotion } from '@/components/motion/Reveal';

/* ================= Marquee ================= */
export function Marquee() {
  const items = ['Piscines sur mesure', 'Bâtiments clés en main', 'Génie civil', 'Villas', 'Travaux publics & VRD', 'Rénovation', 'Études & ingénierie'];
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-[#F5B800] py-4 text-[#050d1c]">
      <div className="marquee flex w-max gap-10 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="font-display flex items-center gap-10 text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
            {t}
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#050d1c]" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================= Intro + chiffres ================= */
export function IntroStats() {
  const settings = useSettings();
  return (
    <section className="relative bg-[#050d1c] py-24 text-white sm:py-32">
      <div className="blueprint pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-7">
          <Reveal>
            <p className="eyebrow">L&apos;entreprise</p>
          </Reveal>
          <SplitHeading
            text="Une seule équipe, de l'étude à la remise des clés."
            highlight={['clés']}
            className="font-display mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl"
          />
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-300">{settings.description}</p>
          </Reveal>
          <Reveal delay={0.3}>
            <ul className="mt-8 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
              {[
                'Études techniques & plans',
                'Gestion du budget et des délais',
                'Normes tunisiennes & internationales',
                'Sécurité exigeante sur chantier'
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5B800]/15 text-[#F5B800]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:col-span-5">
          {settings.stats.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.08} className="bg-[#081833] p-6 sm:p-8">
              <div className="font-display text-5xl font-extrabold text-white sm:text-6xl">
                <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="mt-3 text-xs font-bold uppercase tracking-wider text-[#F5B800]">{s.label}</div>
              <div className="mt-1 text-xs text-slate-400">{s.description}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= Services ================= */
export function ServicesV2() {
  const services = useServices(true).slice(0, 6);
  return (
    <section className="relative bg-[#f4f1ea] py-24 text-[#050d1c] sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow eyebrow-dark">Nos métiers</p>
            </Reveal>
            <SplitHeading
              text="Ce que nous construisons."
              highlight={['construisons']}
              className="font-display mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl [&_.text-\[\#F5B800\]]:text-[#c99400]"
            />
          </div>
          <Reveal delay={0.2}>
            <Link href="/services" className="group inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              Tous les services
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 border-t border-[#050d1c]/15">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.05}>
              <Link
                href="/services"
                className="service-row group relative grid grid-cols-12 items-center gap-4 border-b border-[#050d1c]/15 py-7 sm:py-9"
              >
                <span className="col-span-2 font-mono text-sm text-[#050d1c]/50 sm:col-span-1">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-display col-span-10 text-2xl font-extrabold uppercase leading-none tracking-tight transition-transform duration-500 group-hover:translate-x-3 sm:col-span-6 sm:text-4xl">
                  {s.title}
                </h3>
                <p className="col-span-12 text-sm leading-relaxed text-[#050d1c]/70 sm:col-span-4">{s.description}</p>
                <span className="col-span-1 hidden justify-self-end sm:block">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#050d1c]/20 transition-all duration-500 group-hover:rotate-45 group-hover:border-[#050d1c] group-hover:bg-[#050d1c] group-hover:text-[#F5B800]">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </span>
                {s.image_url && (
                  <span className="service-preview pointer-events-none absolute right-24 top-1/2 hidden h-40 w-60 -translate-y-1/2 overflow-hidden rounded-xl lg:block">
                    <Image src={getImagePath(s.image_url)} alt="" fill sizes="240px" className="object-cover" />
                  </span>
                )}
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= Processus ================= */
const STEPS = [
  { title: 'Écoute & visite', text: 'On visite le terrain, on comprend votre besoin, votre budget et vos délais.' },
  { title: 'Étude & devis', text: 'Plans, étude technique et devis détaillé, poste par poste. Sans surprise.' },
  { title: 'Chantier', text: 'Un chef de projet unique, des points d’avancement réguliers, la sécurité avant tout.' },
  { title: 'Livraison', text: 'Réception des travaux, remise des clés et suivi après livraison.' }
];

export function ProcessSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="relative bg-[#050d1c] py-24 text-white sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <p className="eyebrow">Méthode</p>
          </Reveal>
          <SplitHeading
            text="Un chantier maîtrisé, étape par étape."
            highlight={['maîtrisé,']}
            className="font-display mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          />
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md text-slate-300">
              Vous savez toujours où en est votre projet. C&apos;est ce qui fait la différence entre un chantier
              qui stresse et un chantier qui avance.
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="relative lg:col-span-7">
          <div className="absolute left-[22px] top-2 bottom-2 w-px bg-white/10" />
          <motion.div
            style={reduce ? { scaleY: 1 } : { scaleY }}
            className="absolute left-[22px] top-2 bottom-2 w-px origin-top bg-[#F5B800]"
          />
          <ol className="space-y-14">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <li className="relative flex gap-8">
                  <span className="font-display relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#F5B800] bg-[#050d1c] text-sm font-extrabold text-[#F5B800]">
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">{s.title}</h3>
                    <p className="mt-3 max-w-lg text-slate-300">{s.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ================= Piscines (Trabaf Pool) ================= */
export function PoolSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.88, 1]);
  const radius = useTransform(scrollYProgress, [0, 0.4], [40, 0]);

  return (
    <section ref={ref} className="relative bg-[#050d1c] text-white">
      <motion.div style={reduce ? undefined : { scale, borderRadius: radius }} className="relative h-[90vh] overflow-hidden">
        <motion.div style={reduce ? undefined : { y }} className="absolute inset-[-12%]">
          <Image src={getImagePath('/images/piscines_banner.png')} alt="Piscine sur mesure réalisée par TRABAF" fill sizes="100vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#031a2e] via-[#031a2e]/85 to-[#031a2e]/30" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="eyebrow !text-[#7dd3fc] before:!bg-[#7dd3fc]">Trabaf Pool</p>
          </Reveal>
          <SplitHeading
            text="Votre piscine, dessinée pour vous."
            highlight={['piscine,']}
            className="font-display mt-5 max-w-3xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-7xl [&_.text-\[\#F5B800\]]:text-[#7dd3fc]"
          />
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-lg text-lg text-slate-200">
              Béton armé ou liner, miroir ou débordement, filtration automatisée et plages immergées. Conçue,
              fabriquée et posée par nos équipes.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/devis?type=piscine"
                className="inline-flex items-center gap-2 rounded-full bg-[#7dd3fc] px-7 py-4 text-sm font-extrabold uppercase tracking-wider text-[#031a2e] transition-colors hover:bg-white"
              >
                Devis piscine
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </motion.div>
    </section>
  );
}

/* ================= Partenaires ================= */
export function PartnersSection() {
  const partners = usePartners();
  if (partners.length === 0) return null;
  return (
    <section className="relative bg-[#f4f1ea] py-24 text-[#050d1c] sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <p className="eyebrow eyebrow-dark justify-center">Partenariats</p>
          </Reveal>
          <SplitHeading
            text="Ils construisent avec nous."
            className="font-display mx-auto mt-5 max-w-3xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl"
          />
        </div>

        <div className={`mt-14 grid gap-6 ${partners.length > 1 ? 'md:grid-cols-2' : ''} ${partners.length > 2 ? 'lg:grid-cols-3' : ''}`}>
          {partners.map((p, i) => {
            const inner = (
              <>
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition-opacity duration-700 group-hover:opacity-50"
                  style={{ background: p.accent }}
                />
                <div className="flex h-28 items-center">
                  {p.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getImagePath(p.logo_url)} alt={p.name} className="max-h-24 w-auto object-contain" />
                  ) : (
                    <span className="font-display text-5xl font-extrabold uppercase tracking-tight sm:text-6xl">
                      {p.name.split(' ')[0]}
                      <span style={{ color: p.accent }}> {p.name.split(' ').slice(1).join(' ')}</span>
                    </span>
                  )}
                </div>
                <div className="mt-8 flex items-end justify-between gap-6 border-t border-[#050d1c]/10 pt-6">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: p.accent === '#F5B800' ? '#b88700' : p.accent }}>
                      {p.tagline}
                    </div>
                    <p className="mt-2 max-w-sm text-sm text-[#050d1c]/70">{p.description}</p>
                  </div>
                  {p.url && <ArrowUpRight className="h-6 w-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />}
                </div>
              </>
            );
            const cls =
              'group relative block overflow-hidden rounded-3xl border border-[#050d1c]/10 bg-white p-8 shadow-[0_30px_60px_-30px_rgba(5,13,28,0.25)] transition-transform duration-500 hover:-translate-y-1 sm:p-10';
            return (
              <Reveal key={p.id} delay={i * 0.1}>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================= CTA final ================= */
export function FinalCta() {
  const settings = useSettings();
  return (
    <section className="relative overflow-hidden bg-[#F5B800] py-24 text-[#050d1c] sm:py-32">
      <div className="hazard pointer-events-none absolute inset-x-0 top-0 h-3" />
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <SplitHeading
          text="Parlons de votre projet."
          className="font-display mx-auto max-w-4xl text-5xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-8xl"
        />
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-xl text-lg font-medium">
            Étude personnalisée et devis gratuit. Réponse rapide de nos ingénieurs.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic>
              <Link
                href="/devis"
                className="group inline-flex items-center gap-3 rounded-full bg-[#050d1c] px-9 py-5 text-sm font-extrabold uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-[#050d1c]"
              >
                Demander mon devis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <a href={telLink(settings.phone)} className="inline-flex items-center gap-2 rounded-full border-2 border-[#050d1c] px-8 py-[18px] text-sm font-extrabold">
              <Phone className="h-4 w-4" />
              {settings.phone}
            </a>
            <a
              href={whatsappLink(settings.whatsapp, 'Bonjour TRABAF, je souhaite un devis.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#050d1c] px-8 py-[18px] text-sm font-extrabold"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= Bouton WhatsApp flottant ================= */
export function WhatsAppFloat() {
  const settings = useSettings();
  return (
    <a
      href={whatsappLink(settings.whatsapp, 'Bonjour TRABAF, je souhaite des informations.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter TRABAF sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-5px_rgba(37,211,102,0.6)] transition-transform hover:scale-110"
    >
      <MessageCircle className="h-7 w-7" />
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30" />
    </a>
  );
}
