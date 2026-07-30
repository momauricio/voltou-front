import type { ReactNode } from 'react';
import {
  PainelMobileChrome,
  PainelSidebar,
} from '@/components/painel/painel-nav';
import { OnboardingWizard } from '@/components/painel/onboarding-wizard';

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full text-foreground lg:flex lg:h-dvh lg:overflow-hidden">
      <PainelSidebar />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-muted/35 lg:min-h-0 lg:overflow-y-auto">
        <PainelMobileChrome />

        <main
          className="mx-auto w-full max-w-[1200px] flex-1 space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
          style={{ paddingBottom: 'calc(1.25rem + var(--painel-pad-bottom))' }}
        >
          <OnboardingWizard />
          {children}
        </main>
      </div>
    </div>
  );
}
