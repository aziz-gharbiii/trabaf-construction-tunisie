'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrabafLogo } from '@/components/ui/TrabafLogo';
import { DataService } from '@/lib/data-service';
import { AdminAuth, remoteEnabled } from '@/lib/remote';
import { getSupabase } from '@/lib/supabase/client';
import { Lock, Mail, AlertCircle, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

const input =
  'w-full bg-[#081B38] border-2 border-[#18437E] focus:border-[#F5B800] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors';

type Mode = 'login' | 'set-password' | 'forgot' | 'forgot-sent';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    setIsLocal(['localhost', '127.0.0.1'].includes(window.location.hostname));
    if (!remoteEnabled) return;
    // Lien reçu par email (invitation ou mot de passe oublié) → choisir un mot de passe
    const hash = window.location.hash;
    const fromEmail = /type=(invite|recovery|signup)/.test(hash);
    const linkError = /error_description=([^&]+)/.exec(hash);
    getSupabase(); // lit le jeton présent dans l'URL et ouvre la session
    if (linkError) {
      setErrorMsg(decodeURIComponent(linkError[1].replace(/\+/g, ' ')));
      return;
    }
    if (fromEmail) {
      setMode('set-password');
      return;
    }
    AdminAuth.isAdmin().then((ok) => ok && router.replace('/admin/dashboard'));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 10) return setErrorMsg('Choisissez au moins 10 caractères.');
    if (password !== password2) return setErrorMsg('Les deux mots de passe ne correspondent pas.');
    setIsSubmitting(true);
    const err = await AdminAuth.setPassword(password);
    if (err) {
      setErrorMsg(err);
      setIsSubmitting(false);
      return;
    }
    history.replaceState(null, '', '/admin/login');
    if (await AdminAuth.isAdmin()) {
      router.push('/admin/dashboard');
    } else {
      await AdminAuth.signOut();
      setErrorMsg("Mot de passe enregistré, mais ce compte n'a pas encore les droits administrateur.");
      setMode('login');
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    const err = await AdminAuth.sendReset(email.trim());
    setIsSubmitting(false);
    if (err) return setErrorMsg(err);
    setMode('forgot-sent');
  };

  const titles: Record<Mode, string> = {
    login: 'Accès Administration',
    'set-password': 'Choisissez votre mot de passe',
    forgot: 'Mot de passe oublié',
    'forgot-sent': 'Email envoyé'
  };

  const submitBtn = (label: string) => (
    <button
      type="submit"
      disabled={isSubmitting}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5B800] px-6 py-3.5 text-sm font-black text-[#081B38] shadow-lg transition-all hover:bg-[#D9A300] disabled:opacity-50"
    >
      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
      <span>{isSubmitting ? 'Patientez…' : label}</span>
    </button>
  );

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
            <span>{titles[mode]}</span>
          </div>
        </div>

        {errorMsg && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/80 p-3.5 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
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
              {remoteEnabled && (
                <button type="button" onClick={() => { setMode('forgot'); setErrorMsg(null); }} className="mt-2 text-xs text-slate-400 hover:text-[#F5B800]">
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            {submitBtn('Se connecter')}
          </form>
        )}

        {mode === 'set-password' && (
          <form onSubmit={handleSetPassword} className="space-y-5">
            <p className="text-xs text-slate-300">Choisissez le mot de passe de votre compte administrateur (10 caractères minimum).</p>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5B800]" />
              <input type="password" autoComplete="new-password" aria-label="Nouveau mot de passe" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5B800]" />
              <input type="password" autoComplete="new-password" aria-label="Confirmer le mot de passe" placeholder="Confirmer le mot de passe" value={password2} onChange={(e) => setPassword2(e.target.value)} required className={input} />
            </div>
            {submitBtn('Enregistrer et entrer')}
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-5">
            <p className="text-xs text-slate-300">Recevez un lien par email pour choisir un nouveau mot de passe.</p>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5B800]" />
              <input type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={input} />
            </div>
            {submitBtn('Envoyer le lien')}
            <button type="button" onClick={() => setMode('login')} className="w-full text-xs text-slate-400 hover:text-white">
              Retour à la connexion
            </button>
          </form>
        )}

        {mode === 'forgot-sent' && (
          <div className="space-y-4 text-center text-sm text-slate-200">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p>Si cet email correspond à un compte, vous allez recevoir un lien. Ouvrez-le sur cet appareil.</p>
            <button type="button" onClick={() => setMode('login')} className="text-xs text-slate-400 hover:text-white">
              Retour à la connexion
            </button>
          </div>
        )}

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
