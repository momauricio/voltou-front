'use client';

import { LandingBrand } from '@/components/landing/landing-brand';
import { trackClickCtaCriarConta } from '@/lib/analytics';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-[rgba(17,30,21,0.08)] bg-[#f6fbf6] md:h-16">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <LandingBrand />
        <nav className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground sm:gap-3">
          <a href="/entrar" className="px-2 py-2 hover:text-foreground">
            Entrar
          </a>
          <a
            href="/entrar?tab=criar"
            onClick={() => trackClickCtaCriarConta('nav')}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0e9254] px-4 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Criar Conta
          </a>
        </nav>
      </div>
    </header>
  );
}
