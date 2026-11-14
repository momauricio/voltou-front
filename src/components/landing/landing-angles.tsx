'use client';

import { useInView } from '@/components/landing/use-in-view';
import { LANDING_ANGLES } from '@/lib/landing-copy';

export function LandingAngles() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="angulos"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 bg-muted/40 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div
        className={`mx-auto grid max-w-6xl gap-4 sm:gap-6 md:grid-cols-3 ${
          inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        } transition duration-700`}
      >
        {LANDING_ANGLES.map((angle) => (
          <article
            key={angle.title}
            className="rounded-2xl border border-border bg-card p-6 text-left shadow-[var(--shadow-soft)] sm:p-7"
          >
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {angle.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {angle.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
