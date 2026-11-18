'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrabafLogo } from '@/components/ui/TrabafLogo';
import { DataService } from '@/lib/data-service';
import { AdminAuth, remoteEnabled } from '@/lib/remote';
import { Lock, Mail, AlertCircle, Loader2, ArrowLeft, KeyRound } from 'lucide-react';

const input =
  'w-full bg-[#081B38] border-2 border-[#18437E] focus:border-[#F5B800] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    setIsLocal(['localhost', '127.0.0.1'].includes(window.location.hostname));
    // Déjà connecté ? → tableau de bord
    if (remoteEnabled) {
      AdminAuth.isAdmin().then((ok) => ok && router.replace('/admin/dashboard'));
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (remoteEnabled) {
      const err = await AdminAuth.signIn(email.trim(), password);
      if (err) {
        setErrorMsg(err);
        setIsSubmitting(false);
        return;
      }
      router.push('/admin/dashboard');
      return;
    }

    // Mode démo (sans Supabase) : uniquement en développement local
    if (isLocal && password === 'demo') {
      DataService.setAdminLoggedIn(true);
      router.push('/admin/dashboard');
    } else {
      setErrorMsg(isLocal ? 'Mode démo : mot de passe « demo ».' : "Le back-office n'est pas encore configuré (Supabase).");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#081B38] p-4 text-white">
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#F5B800]/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#18437E]/40 blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-6 rounded-3xl border-2 border-[#F5B800]/40 bg-[#0E2E5C] p-8 shadow-2xl">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-xl bg-white px-3 py-2">
            <TrabafLogo height={52} width={200} />
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#F5B800]/30 bg-[#18437E] px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-[#F5B800]">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Accès Administration</span>
          </div>
        </div>

        {errorMsg && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/80 p-3.5 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {remoteEnabled && (
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-xs font-bold text-slate-200">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5B800]" />
                <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className={input} />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="admin-password" className="mb-2 block text-xs font-bold text-slate-200">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5B800]" />
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5B800] px-6 py-3.5 text-sm font-black text-[#081B38] shadow-lg transition-all hover:bg-[#D9A300] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Vérification…</span>
              </>
            ) : (
              <span>Se connecter</span>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between border-t border-[#18437E] pt-4 text-xs">
          <Link href="/" className="flex items-center gap-1 text-slate-400 transition-colors hover:text-[#F5B800]">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour au site public</span>
          </Link>
          <span className="font-mono text-[10px] text-slate-500">{remoteEnabled ? 'Supabase' : 'Mode démo'}</span>
        </div>
      </div>
    </div>
  );
}
