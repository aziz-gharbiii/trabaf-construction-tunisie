'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { ImageUpload } from '@/components/admin/ImageUpload';
import type { Partner } from '@/types';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2, Handshake } from 'lucide-react';

const emptyPartner = (order: number): Partner => ({
  id: 'partner-' + Date.now(),
  name: '',
  tagline: 'Partenaire officiel',
  description: '',
  url: '',
  logo_url: '',
  accent: '#F5B800',
  display_order: order,
  is_active: true
});

const input =
  'w-full rounded-lg border border-[#18437E] bg-[#081B38] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#F5B800] focus:outline-none';

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPartners([...(DataService.getCompanySettings().partners ?? [])].sort((a, b) => a.display_order - b.display_order));
  }, []);

  const update = (id: string, patch: Partial<Partner>) => {
    setSaved(false);
    setPartners((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= partners.length) return;
    const next = [...partners];
    [next[i], next[j]] = [next[j], next[i]];
    setPartners(next.map((p, k) => ({ ...p, display_order: k + 1 })));
    setSaved(false);
  };

  const remove = (id: string) => {
    if (!window.confirm('Supprimer ce partenaire ?')) return;
    setPartners((list) => list.filter((p) => p.id !== id).map((p, k) => ({ ...p, display_order: k + 1 })));
    setSaved(false);
  };

  const save = () => {
    const clean = partners.filter((p) => p.name.trim()).map((p, k) => ({ ...p, name: p.name.trim(), display_order: k + 1 }));
    const settings = DataService.getCompanySettings();
    DataService.updateCompanySettings({ ...settings, partners: clean });
    setPartners(clean);
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Handshake className="h-6 w-6 text-[#F5B800]" />
            Partenariats
          </h1>
          <p className="mt-1 text-sm text-slate-400">Les partenaires affichés sur la page d&apos;accueil (section « Ils construisent avec nous »).</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPartners((l) => [...l, emptyPartner(l.length + 1)])}
            className="inline-flex items-center gap-2 rounded-lg border border-[#F5B800]/40 bg-[#0E2E5C] px-4 py-2 text-xs font-bold text-white hover:bg-[#18437E]"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
          <button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-[#F5B800] px-4 py-2 text-xs font-black text-[#081B38] hover:bg-[#D9A300]">
            <Save className="h-4 w-4" />
            Enregistrer
          </button>
        </div>
      </div>

      {saved && <div className="rounded-lg border border-emerald-600/50 bg-emerald-950/60 px-4 py-2 text-sm text-emerald-300">Partenaires enregistrés.</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {partners.map((p, i) => (
          <div key={p.id} className={`space-y-3 rounded-2xl border bg-[#0E2E5C]/60 p-5 ${p.is_active ? 'border-[#18437E]' : 'border-slate-700 opacity-60'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Partenaire #{i + 1}</span>
              <div className="flex gap-1">
                <button onClick={() => move(i, -1)} className="rounded p-1.5 text-slate-300 hover:bg-white/10" aria-label="Monter">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(i, 1)} className="rounded p-1.5 text-slate-300 hover:bg-white/10" aria-label="Descendre">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button onClick={() => update(p.id, { is_active: !p.is_active })} className="rounded p-1.5 text-slate-300 hover:bg-white/10" aria-label="Afficher / masquer">
                  {p.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => remove(p.id)} className="rounded p-1.5 text-rose-400 hover:bg-rose-950" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">
                Nom *
                <input className={`${input} mt-1`} value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} placeholder="Ex : Nova Dar" />
              </label>
              <label className="text-xs font-bold text-slate-300">
                Accroche
                <input className={`${input} mt-1`} value={p.tagline} onChange={(e) => update(p.id, { tagline: e.target.value })} />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-300">
              Description
              <textarea rows={2} className={`${input} mt-1 resize-none`} value={p.description} onChange={(e) => update(p.id, { description: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-bold text-slate-300">
                Site / page (optionnel)
                <input className={`${input} mt-1`} value={p.url ?? ''} onChange={(e) => update(p.id, { url: e.target.value })} placeholder="https://…" />
              </label>
              <label className="text-xs font-bold text-slate-300">
                Logo (URL ou /images/…)
                <input className={`${input} mt-1`} value={p.logo_url ?? ''} onChange={(e) => update(p.id, { logo_url: e.target.value })} placeholder="Vide = logo texte" />
                <span className="mt-2 block">
                  <ImageUpload label="Envoyer le logo" onUploaded={([url]) => update(p.id, { logo_url: url })} />
                </span>
              </label>
              <label className="text-xs font-bold text-slate-300">
                Couleur
                <input type="color" className="mt-1 block h-[38px] w-14 cursor-pointer rounded-lg border border-[#18437E] bg-[#081B38]" value={p.accent} onChange={(e) => update(p.id, { accent: e.target.value })} />
              </label>
            </div>
          </div>
        ))}
        {partners.length === 0 && <p className="text-sm text-slate-400">Aucun partenaire. Cliquez sur « Ajouter ».</p>}
      </div>
    </div>
  );
}
