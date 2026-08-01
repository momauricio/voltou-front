'use client';

import { JourneyStrip } from '@/components/landing/mocks/journey-strip';
import { useInView } from '@/components/landing/use-in-view';

export function LandingMechanism() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="fluxo"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 bg-background px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className={`text-3xl font-bold tracking-tight text-foreground sm:text-4xl transition duration-700 ${
              inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            Assim recuperamos mais vendas pra você
          </h2>
          <p
            className={`mt-4 text-muted-foreground transition duration-700 delay-100 ${
              inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Do balcão ao dinheiro na conta — sem você precisar atender o
            WhatsApp o dia inteiro.
          </p>
        </div>

        <div
          className={`mt-12 transition duration-700 delay-150 sm:mt-14 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <JourneyStrip />
        </div>
      </div>
    </section>
  );
}
