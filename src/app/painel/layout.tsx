import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { PainelNav } from '@/components/painel/painel-nav';
import { OnboardingWizard } from '@/components/painel/onboarding-wizard';

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
          <BrandLogo href="/painel" className="min-w-0 shrink" />
          <PainelNav />
        </div>
      </header>
      <main
        className="mx-auto w-full max-w-[1200px] space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8"
        style={{ paddingBottom: 'calc(1.25rem + var(--painel-pad-bottom))' }}
      >
        <OnboardingWizard />
        {children}
      </main>
    </div>
  );
}
