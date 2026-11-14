'use client';

import { LANDING_JOURNEY_STEPS as STEPS } from '@/lib/landing-copy';

export function JourneyStrip() {
  return (
    <ol className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {STEPS.map((step, i) => (
        <li
          key={step.n}
          className="relative flex flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-[var(--shadow-soft)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {step.n}
            </span>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="hidden h-px flex-1 bg-border lg:block"
              />
            ) : null}
          </div>
          <p className="mt-4 text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
            {step.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
