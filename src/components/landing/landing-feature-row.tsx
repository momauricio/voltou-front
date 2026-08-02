'use client';

import type { ReactNode } from 'react';
import { useInView } from '@/components/landing/use-in-view';

type LandingFeatureRowProps = {
  id?: string;
  title: string;
  body: ReactNode;
  visual: ReactNode;
  /** When true, visual is on the left on desktop */
  reverse?: boolean;
  mutedBg?: boolean;
};

export function LandingFeatureRow({
  id,
  title,
  body,
  visual,
  reverse = false,
  mutedBg = false,
}: LandingFeatureRowProps) {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id={id}
      ref={ref}
      className={`scroll-mt-20 border-t border-border/60 px-4 py-16 sm:px-6 sm:py-24 ${
        mutedBg ? 'bg-muted/40' : 'bg-background'
      }`}
    >
      <div
        className={`mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14 ${
          reverse ? 'lg:[&>*:first-child]:order-2' : ''
        }`}
      >
        <div
          className={`text-center lg:text-left transition duration-700 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl sm:leading-tight">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {body}
          </p>
        </div>

        <div
          className={`transition duration-700 delay-100 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          {visual}
        </div>
      </div>
    </section>
  );
}
