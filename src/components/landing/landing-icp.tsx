'use client';

import { useInView } from '@/components/landing/use-in-view';

export function LandingIcp() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="para-quem"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl sm:leading-tight transition duration-700 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Feito pra loja física que perde a segunda venda
        </h2>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:mt-12 sm:grid-cols-2 sm:gap-14">
        <div
          className={`text-left transition duration-700 delay-100 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <p className="text-sm font-semibold text-primary">É pra você se</p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground sm:text-[15px]">
            <li className="flex gap-2.5">
              <span className="mt-0.5 text-primary" aria-hidden>
                ✓
              </span>
              Loja física — calçado, moda, acessórios, presente
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 text-primary" aria-hidden>
                ✓
              </span>
              Tem WhatsApp do cliente
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 text-primary" aria-hidden>
                ✓
              </span>
              Não tem equipe pra chase pós-venda
            </li>
          </ul>
        </div>

        <div
          className={`text-left transition duration-700 delay-150 ${
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
              Só marketplace sem o contato do cliente
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5" aria-hidden>
                —
              </span>
              Quer blast genérico em massa
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5" aria-hidden>
                —
              </span>
              Precisa de ERP / PDV fiscal
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
