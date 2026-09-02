import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Equipe',
  robots: { index: false, follow: false },
};

export default function EquipeRootLayout({ children }: { children: ReactNode }) {
  return children;
}
