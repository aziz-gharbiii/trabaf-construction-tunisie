'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TrabafLogo } from '@/components/ui/TrabafLogo';
import { DataService, syncAdmin, syncMessages, clearLocalCache } from '@/lib/data-service';
import { AdminAuth, remoteEnabled } from '@/lib/remote';
import {
  LayoutDashboard,
  Building,
  Wrench,
  Mail,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  UserCheck,
  Handshake,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Protection : seul un compte admin (Supabase) peut voir le back-office, puis synchro des données
  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      const ok = remoteEnabled ? await AdminAuth.isAdmin() : DataService.isAdminLoggedIn();
      if (cancelled) return;
      if (!ok) {
        router.replace('/admin/login');
        return;
      }
      if (remoteEnabled) {
        await syncAdmin();
        setAdminEmail(await AdminAuth.email());
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLogin, router]);

  // Nouveaux devis : vérification toutes les 60 s
  useEffect(() => {
    if (!remoteEnabled || !ready) return;
    const t = setInterval(() => void syncMessages(), 60000);
    return () => clearInterval(t);
  }, [ready]);

  // Erreurs d'enregistrement Supabase → message visible
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onError = (e: Event) => {
      setToast(String((e as CustomEvent).detail));
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 7000);
    };
    window.addEventListener('trabaf_sync_error', onError);
    return () => window.removeEventListener('trabaf_sync_error', onError);
  }, []);

  useEffect(() => {
    const updateUnread = () => {
      const msgs = DataService.getMessages();
      setUnreadCount(msgs.filter((m) => m.status === 'new').length);
    };
    updateUnread();
    window.addEventListener('trabaf_storage_updated', updateUnread);
    return () => window.removeEventListener('trabaf_storage_updated', updateUnread);
  }, []);

  if (isLogin) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-[#F5B800]" />
        Chargement du back-office…
      </div>
    );
  }

  const handleLogout = async () => {
    if (remoteEnabled) {
      await AdminAuth.signOut();
      clearLocalCache();
    } else {
      DataService.setAdminLoggedIn(false);
    }
    router.push('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Projets (Portfolio)', href: '/admin/projets', icon: Building },
    { name: 'Services BTP', href: '/admin/services', icon: Wrench },
    {
      name: 'Messages Inbound',
      href: '/admin/messages',
      icon: Mail,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { name: 'Partenariats', href: '/admin/partenaires', icon: Handshake },
    { name: 'Paramètres du Site', href: '/admin/settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#081B38] border-b border-[#18437E] p-4 flex items-center justify-between sticky top-0 z-40">
        <TrabafLogo height={38} width={140} />
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 text-white hover:text-[#F5B800]"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 bg-[#081B38] border-r border-[#18437E] flex flex-col justify-between p-4 fixed md:sticky top-0 h-screen z-30 transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Header */}
          <div className="pb-4 border-b border-[#18437E]">
            <TrabafLogo height={42} width={160} />
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#F5B800] mt-2">
              Panneau d&apos;Administration
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#F5B800] text-[#081B38] shadow-md font-black'
                      : 'text-slate-300 hover:bg-[#0E2E5C] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#18437E] space-y-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0E2E5C] hover:bg-[#18437E] text-slate-300 hover:text-[#F5B800] text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Voir le site public</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-200 text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-[#0E2E5C]/90 border-b border-[#18437E] p-4 hidden md:flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <div className="text-xs text-slate-300 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>TRABAF Back-Office Active</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-[#081B38] px-3 py-1.5 rounded-lg border border-[#18437E]">
              <UserCheck className="w-4 h-4 text-[#F5B800]" />
              <span className="font-bold text-white">{adminEmail ?? 'Administrateur TRABAF'}</span>
            </div>
          </div>
        </header>

        {!remoteEnabled && (
          <div className="border-b border-amber-700/50 bg-amber-950/70 px-4 py-2 text-xs text-amber-200">
            Mode démo : Supabase n&apos;est pas configuré, les modifications restent dans ce navigateur.
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-grow">{children}</main>

        {toast && (
          <div role="alert" className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-rose-500/60 bg-rose-950 p-4 text-sm text-rose-100 shadow-2xl">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>Échec de l&apos;enregistrement — {toast}</span>
          </div>
        )}
      </div>
    </div>
  );
}
