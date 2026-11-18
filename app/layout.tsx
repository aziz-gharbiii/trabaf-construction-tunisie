import type { Metadata } from 'next';
import { Archivo, Manrope, JetBrains_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { VisitorTracker } from '@/components/ui/VisitorTracker';

const display = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth']
});

const sans = Manrope({
  variable: '--font-manrope',
  subsets: ['latin']
});

const serif = Instrument_Serif({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic']
});

const mono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin']
});

export const metadata: Metadata = {
  metadataBase: new URL('https://trabafconstruction.com'),
  title: 'TRABAF Construction Tunisie | Bâtiment, Génie Civil & Piscines sur Mesure',
  description:
    'Entreprise de construction en Tunisie : bâtiments clés en main, villas, génie civil, travaux publics et piscines sur mesure. Devis gratuit.',
  openGraph: {
    title: 'TRABAF Construction Tunisie',
    description: 'Bâtiments clés en main, génie civil et piscines sur mesure en Tunisie. Devis gratuit en 60 secondes.',
    url: 'https://trabafconstruction.com',
    siteName: 'TRABAF Construction',
    images: ['/images/poster_official.png'],
    locale: 'fr_TN',
    type: 'website'
  }
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
