'use client';

import { useInView } from '@/components/landing/use-in-view';

export function LandingIcp() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="para-quem"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl sm:leading-tight transition duration-700 ${
            inView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          Feito para quem vende no balcão
        </h2>
        <p
          className={`mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg transition duration-700 delay-100 ${
            inView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-3 opacity-0'
          }`}
        >
          Loja física sem braço pra chase depois da venda. Quem já comprou ou
          demonstrou interesse — e ninguém atende de forma personalizada — é
          dinheiro na mesa. A Voltou. vende por você no WhatsApp.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-10 sm:mt-14 sm:grid-cols-2 sm:gap-16">
        <div
          className={`text-left transition duration-700 delay-150 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <p className="text-sm font-semibold text-primary">É pra você se</p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground sm:text-[15px]">
            <li className="flex gap-2.5">
              <span className="mt-0.5 text-primary" aria-hidden>
                ✓
              </span>
              Tem loja física — calçado, moda, acessórios, presente
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 text-primary" aria-hidden>
                ✓
              </span>
              Já fala com cliente no WhatsApp Business
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 text-primary" aria-hidden>
                ✓
              </span>
              Não tem equipe pra chase pós-venda — e deixa recompra e upsell pra
              depois
            </li>
          </ul>
        </div>

        <div
          className={`text-left transition duration-700 delay-200 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <p className="text-sm font-semibold text-muted-foreground">
            Provavelmente não, se
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            <li className="flex gap-2.5">
              <span className="mt-0.5" aria-hidden>
                —
              </span>
              Só vende em marketplace e não tem o contato do cliente
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5" aria-hidden>
                —
              </span>
              Precisa de ERP, estoque avançado ou PDV fiscal
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5" aria-hidden>
                —
              </span>
              Quer disparar milhares de mensagens genéricas por dia
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
