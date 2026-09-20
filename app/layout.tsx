import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'CITY Électronique | High-Tech & Électronique Premium au Maroc',
  description: "Boutique d'électronique premium au Maroc : audio, smartphones, image et accessoires haut de gamme. Commande rapide sur WhatsApp et livraison express.",
  openGraph: {
    title: 'CITY Électronique | High-Tech & Électronique Premium au Maroc',
    description: "Boutique d'électronique premium au Maroc : audio, smartphones, image et accessoires haut de gamme.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CITY Électronique | High-Tech & Électronique Premium au Maroc',
    description: "Boutique d'électronique premium au Maroc : audio, smartphones, image et accessoires haut de gamme.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
