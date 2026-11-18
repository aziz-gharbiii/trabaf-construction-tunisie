'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DataService } from '@/lib/data-service';
import { Project, Service, Message, VisitorLog } from '@/types';
import { getVisitorStats, clearVisitorLogs } from '@/lib/visitor-tracker';
import { formatDate } from '@/lib/utils';
import { projectHref } from '@/lib/hooks';
import {
  Building,
  Wrench,
  Mail,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Users,
  Globe,
  Trash2,
  Sparkles
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorStats, setVisitorStats] = useState<{
    totalVisits: number;
    uniqueIpCount: number;
    uniqueIps: string[];
    recentVisitors: VisitorLog[];
  }>({ totalVisits: 0, uniqueIpCount: 0, uniqueIps: [], recentVisitors: [] });

  const loadData = () => {
    setProjects(DataService.getProjects());
    setServices(DataService.getServices());
    setMessages(DataService.getMessages());
    void getVisitorStats().then(setVisitorStats);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('trabaf_storage_updated', loadData);
    return () => window.removeEventListener('trabaf_storage_updated', loadData);
  }, []);

  const unreadMessages = messages.filter((m) => m.status === 'new');
  const realMessages = messages.filter((m) => m.is_real === true);
  const featuredCount = projects.filter((p) => p.is_featured).length;

  const handleClearVisitors = () => {
    if (confirm("Voulez-vous réinitialiser le journal des visiteurs réels ?")) {
      void clearVisitorLogs().then(loadData);
    }
  };

  return (
    <div className="space-y-8 text-white">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0E2E5C] via-[#18437E] to-[#081B38] p-6 sm:p-8 rounded-3xl border-2 border-[#F5B800]/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5B800] text-[#081B38] text-xs font-black uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Tableau de Bord Administrateur</span>
          </div>
          <h1 className="text-3xl font-black text-white">Gestion TRABAF Construction</h1>
          <p className="text-slate-200 text-xs sm:text-sm max-w-xl">
            Gérez votre portfolio, suivez les adresses IP des visiteurs en direct et traitez les demandes de devis réelles.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/projets"
            className="inline-flex items-center gap-2 bg-[#F5B800] hover:bg-[#D9A300] text-[#081B38] font-extrabold px-5 py-2.5 rounded-xl shadow text-xs transition-transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Projet</span>
          </Link>
          <Link
            href="/admin/messages"
            className="inline-flex items-center gap-2 bg-[#18437E] hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl border border-slate-700 text-xs transition-colors"
          >
            <Mail className="w-4 h-4 text-[#F5B800]" />
            <span>Voir Devis ({realMessages.length} réels)</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Visitors IP */}
        <div className="bg-[#0E2E5C] p-6 rounded-2xl border border-emerald-500/40 shadow-lg space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 bg-emerald-500/10 rounded-bl-2xl">
            <Globe className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-xs font-bold uppercase text-slate-300">Visiteurs uniques (IP)</div>
          <div className="text-3xl font-black text-emerald-400">{visitorStats.uniqueIpCount} visiteurs</div>
          <div className="text-xs text-slate-300">
            Total vues: <strong className="text-white">{visitorStats.totalVisits} pages</strong>
          </div>
        </div>

        {/* Metric 2: Real Leads */}
        <div className="bg-[#0E2E5C] p-6 rounded-2xl border border-[#F5B800]/40 shadow-lg space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Devis Réels Reçus</span>
            <Sparkles className="w-5 h-5 text-[#F5B800]" />
          </div>
          <div className="text-3xl font-black text-[#F5B800]">{realMessages.length}</div>
          <div className="text-xs text-slate-300">
            <strong className="text-rose-400">{unreadMessages.length}</strong> non lus à traiter
          </div>
        </div>

        {/* Metric 3: Projects */}
        <div className="bg-[#0E2E5C] p-6 rounded-2xl border border-[#18437E] shadow-lg space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Projets Portfolio</span>
            <Building className="w-5 h-5 text-[#F5B800]" />
          </div>
          <div className="text-3xl font-black text-white">{projects.length}</div>
          <div className="text-xs text-slate-300">
            dont <strong className="text-[#F5B800]">{featuredCount}</strong> mis en avant
          </div>
        </div>

        {/* Metric 4: Services */}
        <div className="bg-[#0E2E5C] p-6 rounded-2xl border border-[#18437E] shadow-lg space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Services Actifs</span>
            <Wrench className="w-5 h-5 text-[#F5B800]" />
          </div>
          <div className="text-3xl font-black text-white">{services.filter((s) => s.is_active).length}</div>
          <div className="text-xs text-slate-300">Services BTP & Piscines</div>
        </div>
      </div>

      {/* Two Column Section: Recent Projects & Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Recent Projects */}
        <div className="bg-[#0E2E5C] p-6 rounded-2xl border border-[#18437E] shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#18437E]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-[#F5B800]" />
              Projets Récents
            </h2>
            <Link
              href="/admin/projets"
              className="text-xs font-bold text-[#F5B800] hover:underline flex items-center gap-1"
            >
              <span>Voir tout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-[#081B38] border border-[#18437E] flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="font-bold text-white text-sm line-clamp-1">{p.title}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {p.category} • {p.city} • {p.year}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'Terminé'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-[#F5B800]/20 text-[#F5B800]'
                    }`}
                  >
                    {p.status}
                  </span>
                  <Link
                    href={projectHref(p.slug)}
                    target="_blank"
                    className="p-1.5 rounded bg-[#18437E] text-slate-200 hover:text-[#F5B800]"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Recent Inbound Messages */}
        <div className="bg-[#0E2E5C] p-6 rounded-2xl border border-[#18437E] shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#18437E]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#F5B800]" />
              Derniers Messages Reçus
            </h2>
            <Link
              href="/admin/messages"
              className="text-xs font-bold text-[#F5B800] hover:underline flex items-center gap-1"
            >
              <span>Gérer les messages ({unreadMessages.length} non lus)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Aucun message reçu pour l&apos;instant.</p>
            ) : (
              messages.slice(0, 4).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 text-xs transition-colors ${
                    msg.status === 'new'
                      ? 'bg-rose-950/40 border-rose-600/50'
                      : 'bg-[#081B38] border-[#18437E]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{msg.full_name}</span>
                      {msg.status === 'new' && (
                        <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                          Nouveau
                        </span>
                      )}
                    </div>
                    <div className="text-slate-300 font-semibold">{msg.subject}</div>
                    <div className="text-slate-400 text-[11px] line-clamp-1">{msg.message}</div>
                  </div>

                  <Link
                    href="/admin/messages"
                    className="p-1.5 rounded bg-[#18437E] text-slate-200 hover:text-[#F5B800] shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Visitor IP Live Log Section */}
      <div className="bg-[#0E2E5C] p-6 rounded-3xl border-2 border-emerald-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#18437E]">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              Suivi en Direct des Visiteurs & Adresses IP
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Liste en temps réel des visiteurs naviguant sur votre site web trabafconstruction.com.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{visitorStats.uniqueIpCount} visiteur(s) unique(s) — 30 derniers jours</span>
            </span>

            <button
              onClick={handleClearVisitors}
              className="p-2 rounded-xl bg-[#081B38] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#18437E] transition-colors"
              title="Réinitialiser le journal des visiteurs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* IP Visitor Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-[#081B38] text-slate-400 uppercase font-bold border-b border-[#18437E]">
              <tr>
                <th className="p-3">Adresse IP</th>
                <th className="p-3">Localisation</th>
                <th className="p-3">Appareil</th>
                <th className="p-3">Page Consultée</th>
                <th className="p-3 text-right">Date & Heure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18437E]">
              {visitorStats.recentVisitors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Aucun visiteur enregistré pour le moment. Visitez le site pour voir votre IP s&apos;afficher !
                  </td>
                </tr>
              ) : (
                visitorStats.recentVisitors.slice(0, 10).map((v) => (
                  <tr key={v.id} className="hover:bg-[#18437E]/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      {v.ip}
                    </td>
                    <td className="p-3 text-white font-semibold">
                      {v.city ? `${v.city}, ` : ''}{v.country || 'Tunisie'}
                    </td>
                    <td className="p-3 text-slate-300">
                      {v.device || 'Navigateur Web'}
                    </td>
                    <td className="p-3 font-mono text-[#F5B800]">
                      {v.page}
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      {formatDate(v.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
