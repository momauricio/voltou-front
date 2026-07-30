'use client';

import { useInView } from '@/components/landing/use-in-view';

const STEPS = [
  {
    n: '1',
    title: 'Cadastra no balcão',
    body: 'Nome, WhatsApp e o que comprou ou quis. 30 segundos.',
  },
  {
    n: '2',
    title: 'A IA vende no timing certo',
    body: 'Cupom personalizado, ofertas e upsell. Recupera valor que ia embora.',
  },
  {
    n: '3',
    title: 'O dinheiro cai na sua conta',
    body: 'Cliente compra, você recebe na hora — e o aviso do pedido pra entregar.',
  },
];

export function LandingMechanism() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="como-funciona"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 bg-background px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className={`text-xs font-semibold tracking-[0.16em] text-muted-foreground transition duration-700 ${
              inView ? 'opacity-100' : 'opacity-0'
            }`}
          >
            COMO FUNCIONA
          </p>
          <h2
            className={`mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl transition duration-700 delay-75 ${
              inView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
          >
            Três passos. A Voltou. vende; você atende o balcão.
          </h2>
          <p
            className={`mt-4 text-muted-foreground transition duration-700 delay-100 ${
              inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Feito pro balcão — não pra ficar logado no computador.
          </p>
        </div>

        <ol className="mt-14 grid gap-10 sm:mt-16 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className={`text-center sm:text-left transition duration-700 ${
                inView
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: `${180 + i * 100}ms` }}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {step.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
