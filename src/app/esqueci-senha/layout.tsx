import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Esqueci a senha');

export default function EsqueciSenhaLayout({ children }: { children: ReactNode }) {
  return children;
}
