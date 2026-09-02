'use client';

import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { clearStaffSession } from '@/lib/api';

export function EquipeChrome() {
  const router = useRouter();

  function handleSair() {
    clearStaffSession();
    router.push('/equipe/entrar');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-3 sm:h-16 sm:px-6 lg:px-8">
        <BrandLogo href="/equipe" />
        <span className="truncate text-sm font-semibold text-foreground">
          Equipe Voltou
        </span>
        <button
          type="button"
          onClick={handleSair}
          className="ml-auto inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
