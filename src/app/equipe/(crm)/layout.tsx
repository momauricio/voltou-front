import type { ReactNode } from 'react';
import { EquipeChrome } from '@/components/equipe/equipe-chrome';

export default function EquipeCrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-muted/35 text-foreground">
      <EquipeChrome />
      <main className="mx-auto w-full max-w-[1200px] space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
