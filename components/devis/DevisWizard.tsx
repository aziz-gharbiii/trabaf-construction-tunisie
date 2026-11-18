'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Hammer, Home, Loader2, MessageCircle, Route, Sparkles, Waves } from 'lucide-react';
import { DataService } from '@/lib/data-service';
import { getVisitorIpInfo } from '@/lib/visitor-tracker';
import { useSettings, whatsappLink } from '@/lib/hooks';

const TYPES = [
  { id: 'piscine', label: 'Piscine', icon: Waves },
  { id: 'villa', label: 'Villa / Maison', icon: Home },
  { id: 'immeuble', label: 'Immeuble / Bâtiment', icon: Building2 },
  { id: 'genie-civil', label: 'Génie civil / VRD', icon: Route },
  { id: 'renovation', label: 'Rénovation', icon: Hammer },
  { id: 'autre', label: 'Autre projet', icon: Sparkles }
];
const SURFACES = ['< 100 m²', '100 – 300 m²', '300 – 1 000 m²', '> 1 000 m²', 'Je ne sais pas'];
const BUDGETS = ['< 100 000 DT', '100 000 – 300 000 DT', '300 000 – 1 M DT', '> 1 M DT', 'À définir'];
const DELAIS = ['Moins de 3 mois', '3 à 6 mois', '6 à 12 mois', 'Pas encore défini'];

type Form = {
  type: string;
  surface: string;
  budget: string;
  city: string;
  timeline: string;
  details: string;
  name: string;
  phone: string;
  email: string;
};

const EMPTY: Form = { type: '', surface: '', budget: '', city: '', timeline: '', details: '', name: '', phone: '', email: '' };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${
        active ? 'border-[#F5B800] bg-[#F5B800] text-[#050d1c]' : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/40'
      }`}
    >
      {children}
    </button>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-[#F5B800] focus:bg-white/10';

export function DevisWizard() {
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [f, setF] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // Pré-sélection via ?type=piscine
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type');
    if (t && TYPES.some((x) => x.id === t)) setF((s) => ({ ...s, type: t }));
  }, []);

  const set = (k: keyof Form, v: string) => setF((s) => ({ ...s, [k]: v }));
  const typeLabel = TYPES.find((t) => t.id === f.type)?.label ?? f.type;

  const validate = (s: number): string | null => {
    if (s === 0 && !f.type) return 'Choisissez le type de projet.';
    if (s === 1 && !f.city.trim()) return 'Indiquez la ville du projet.';
    if (s === 2) {
      if (f.name.trim().length < 2) return 'Indiquez votre nom.';
      if (f.phone.replace(/[^\d]/g, '').length < 8) return 'Indiquez un numéro de téléphone valide.';
      if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return 'Adresse email invalide.';
    }
    return null;
  };

  const go = (n: number) => {
    if (n > step) {
      const e = validate(step);
      if (e) return setError(e);
    }
    setError(null);
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const summary = () =>
    [
      `Type de projet : ${typeLabel}`,
      `Ville : ${f.city}`,
      f.surface && `Surface : ${f.surface}`,
      f.budget && `Budget : ${f.budget}`,
      f.timeline && `Délai : ${f.timeline}`,
      f.details && `Détails : ${f.details}`
    ]
      .filter(Boolean)
      .join('\n');

  const submit = async () => {
    const e = validate(2);
    if (e) return setError(e);
    setError(null);
    setSending(true);
    try {
      const ip = await getVisitorIpInfo().catch(() => null);
      await DataService.submitMessage({
        full_name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        subject: `Demande de devis — ${typeLabel} (${f.city})`,
        message: summary(),
        is_real: true,
        source: 'devis',
        project_type: typeLabel,
        surface: f.surface,
        budget: f.budget,
        project_city: f.city,
        timeline: f.timeline,
        location: ip ? `${ip.city || ''}${ip.city ? ', ' : ''}${ip.country || ''}` : undefined,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      });
      setDone(true);
    } catch {
      setError("L'envoi a échoué. Réessayez ou contactez-nous sur WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  const waText = `Bonjour TRABAF, je souhaite un devis.\nNom : ${f.name}\nTél : ${f.phone}\n${summary()}`;

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/10 bg-[#081833] p-8 text-center text-white sm:p-12">
        <CheckCircle2 className="mx-auto h-16 w-16 text-[#F5B800]" />
        <h3 className="font-display mt-6 text-3xl font-extrabold uppercase">Demande reçue !</h3>
        <p className="mx-auto mt-3 max-w-md text-slate-300">
          Merci {f.name.split(' ')[0]}. Un ingénieur TRABAF vous rappelle au {f.phone} très rapidement.
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm text-slate-400">Pour aller plus vite, envoyez aussi votre demande sur WhatsApp :</p>
        <a
          href={whatsappLink(settings.whatsapp, waText)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-7 py-4 text-sm font-extrabold text-white"
        >
          <MessageCircle className="h-5 w-5" />
          Envoyer sur WhatsApp
        </a>
        <div>
          <button
            type="button"
            onClick={() => {
              setF(EMPTY);
              setStep(0);
              setDone(false);
            }}
            className="mt-6 text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
          >
            Nouvelle demande
          </button>
        </div>
      </motion.div>
    );
  }

  const titles = ['Votre projet', 'Les détails', 'Vos coordonnées'];

  return (
    <div className="rounded-3xl border border-white/10 bg-[#081833] p-6 text-white shadow-2xl sm:p-10">
      {/* Progression */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-slate-400">Étape {step + 1} / 3</div>
          <h3 className="font-display mt-1 text-2xl font-extrabold uppercase sm:text-3xl">{titles[step]}</h3>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-10 bg-[#F5B800]' : 'w-5 bg-white/15'}`} />
          ))}
        </div>
      </div>

      <div className="relative mt-8 min-h-[300px] overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      set('type', id);
                      setError(null);
                    }}
                    aria-pressed={f.type === id}
                    className={`flex flex-col items-start gap-6 rounded-2xl border p-5 text-left transition-all ${
                      f.type === id ? 'border-[#F5B800] bg-[#F5B800]/10' : 'border-white/10 bg-white/[0.03] hover:border-white/30'
                    }`}
                  >
                    <Icon className={`h-7 w-7 ${f.type === id ? 'text-[#F5B800]' : 'text-slate-400'}`} />
                    <span className="text-sm font-bold">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Ville du projet *</label>
                  <input className={inputCls} aria-label="Ville du projet" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Ex : Hammamet, Sousse, La Marsa…" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Surface approximative</div>
                  <div className="flex flex-wrap gap-2">
                    {SURFACES.map((s) => (
                      <Chip key={s} active={f.surface === s} onClick={() => set('surface', s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Budget estimé</div>
                  <div className="flex flex-wrap gap-2">
                    {BUDGETS.map((s) => (
                      <Chip key={s} active={f.budget === s} onClick={() => set('budget', s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Démarrage souhaité</div>
                  <div className="flex flex-wrap gap-2">
                    {DELAIS.map((s) => (
                      <Chip key={s} active={f.timeline === s} onClick={() => set('timeline', s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Nom complet *</label>
                    <input className={inputCls} aria-label="Nom complet" value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Téléphone *</label>
                    <input className={inputCls} aria-label="Téléphone" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+216 …" inputMode="tel" autoComplete="tel" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Email (optionnel)</label>
                  <input className={inputCls} aria-label="Email" value={f.email} onChange={(e) => set('email', e.target.value)} inputMode="email" autoComplete="email" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Décrivez votre projet (optionnel)</label>
                  <textarea
                    rows={4}
                    className={`${inputCls} resize-none`}
                    aria-label="Description du projet" value={f.details}
                    onChange={(e) => set('details', e.target.value)}
                    placeholder="Terrain, nombre d'étages, type de piscine, contraintes…"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        {step > 0 ? (
          <button type="button" onClick={() => go(step - 1)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="inline-flex items-center gap-2 rounded-full bg-[#F5B800] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wider text-[#050d1c] transition-colors hover:bg-white"
          >
            Continuer
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-full bg-[#F5B800] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wider text-[#050d1c] transition-colors hover:bg-white disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Recevoir mon devis
          </button>
        )}
      </div>
    </div>
  );
}
