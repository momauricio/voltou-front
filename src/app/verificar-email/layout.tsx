import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Confirme seu email');

export default function VerificarEmailLayout({ children }: { children: ReactNode }) {
  return children;
}
