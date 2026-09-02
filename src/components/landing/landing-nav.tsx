import { BrandLogo } from '@/components/brand-logo';

export function LandingNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <BrandLogo withPeriod={false} />
        <nav className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground sm:gap-3">
          <a href="/entrar" className="px-2 py-2 hover:text-foreground">
            Entrar
          </a>
          <a
            href="/entrar?tab=criar"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Criar Conta
          </a>
        </nav>
      </div>
    </header>
  );
}
