'use client';

import { useState } from 'react';
import { useInView } from '@/components/landing/use-in-view';
import { LANDING_FAQ } from '@/lib/landing-copy';


export function LandingFaq() {
  const { ref, inView } = useInView<HTMLElement>();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-2xl">
        <h2
          className={`text-center text-3xl font-bold tracking-tight sm:text-4xl transition duration-700 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Perguntas frequentes
        </h2>

        <div
          className={`mt-10 divide-y divide-border rounded-2xl border border-border bg-card transition duration-700 delay-100 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          {LANDING_FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground sm:text-[15px]"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-muted-foreground"
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen ? (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
