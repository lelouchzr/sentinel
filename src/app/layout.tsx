import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = {
  title: 'Language Speaking · Du vocabulaire à la conversation',
  description: 'Importez vos mots et pratiquez-les dans de vraies situations en coréen.',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
