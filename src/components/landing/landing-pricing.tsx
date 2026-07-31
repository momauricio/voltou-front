'use client';

import { useInView } from '@/components/landing/use-in-view';

export function LandingPricing() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="preco"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl sm:leading-tight transition duration-700 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Sem mensalidade. Sem cartão. Só comissão na venda recuperada.
        </h2>
        <p
          className={`mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg transition duration-700 delay-100 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          Você cria a conta sem cartão. Paga só quando a Voltou recupera uma
          venda que não aconteceria sozinha.
        </p>
      </div>
    </section>
  );
}
