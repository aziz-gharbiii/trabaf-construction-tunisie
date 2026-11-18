'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Menu, MessageCircle, Phone, X } from 'lucide-react';
import { TrabafLogo } from '@/components/ui/TrabafLogo';
import { useSettings, whatsappLink, telLink } from '@/lib/hooks';

const NAV = [
  { name: 'Accueil', href: '/' },
  { name: 'À propos', href: '/a-propos' },
  { name: 'Services', href: '/services' },
  { name: 'Réalisations', href: '/projets' },
  { name: 'Contact', href: '/contact' }
];

// Pages qui gèrent elles-mêmes l'espace sous la barre (hero plein écran)
const FULL_BLEED = ['/', '/devis'];

export function Navbar() {
  const pathname = usePathname();
  const settings = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const solid = scrolled || !FULL_BLEED.includes(pathname);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          solid ? 'border-b border-white/10 bg-[#050d1c]/80 py-3 backdrop-blur-xl' : 'bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="TRABAF Construction — Accueil" className="rounded-xl bg-white px-3 py-1.5">
            <TrabafLogo height={34} width={140} />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive(l.href) ? 'text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {l.name}
                {isActive(l.href) && (
                  <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#F5B800]" />
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a href={telLink(settings.phone)} className="text-sm font-semibold text-slate-300 hover:text-white">
              {settings.phone}
            </a>
            <Link
              href="/devis"
              className="group inline-flex items-center gap-2 rounded-full bg-[#F5B800] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#050d1c] transition-colors hover:bg-white"
            >
              Devis gratuit
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Menu mobile plein écran */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-[#050d1c] px-6 pb-10 pt-28 text-white lg:hidden"
          >
            <nav className="flex flex-col">
              {NAV.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.5 }}
                >
                  <Link
                    href={l.href}
                    className={`font-display block border-b border-white/10 py-4 text-4xl font-extrabold uppercase tracking-tight ${
                      isActive(l.href) ? 'text-[#F5B800]' : ''
                    }`}
                  >
                    {l.name}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="space-y-3">
              <Link
                href="/devis"
                className="flex items-center justify-center gap-2 rounded-full bg-[#F5B800] py-4 text-sm font-extrabold uppercase tracking-wider text-[#050d1c]"
              >
                Devis gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <a href={telLink(settings.phone)} className="flex items-center justify-center gap-2 rounded-full border border-white/15 py-3.5 text-sm font-bold">
                  <Phone className="h-4 w-4 text-[#F5B800]" />
                  Appeler
                </a>
                <a
                  href={whatsappLink(settings.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border border-white/15 py-3.5 text-sm font-bold"
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  WhatsApp
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Espace sous la barre fixe pour les pages classiques */}
      {!FULL_BLEED.includes(pathname) && <div className="h-[72px] bg-[#050d1c]" />}
    </>
  );
}
