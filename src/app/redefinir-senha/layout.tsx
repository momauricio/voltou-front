import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Redefinir senha');

export default function RedefinirSenhaLayout({ children }: { children: ReactNode }) {
  return children;
}
