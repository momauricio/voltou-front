'use client';

import { useInView } from '@/components/landing/use-in-view';

const STEPS = [
  {
    n: '1',
    title: 'Cadastra',
    body: 'Nome, WhatsApp e o que comprou (ou quis). 30 segundos no balcão.',
  },
  {
    n: '2',
    title: 'A IA escolhe e vende',
    body: 'Produto certo + cupom personalizado, no timing certo.',
  },
  {
    n: '3',
    title: 'Cliente paga no link',
    body: 'Compra pelo WhatsApp da loja — não de número estranho.',
  },
  {
    n: '4',
    title: 'Você recebe + aviso',
    body: 'Dinheiro na conta e notificação pra preparar o envio.',
  },
];

export function LandingMechanism() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="fluxo"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 bg-background px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className={`text-3xl font-bold tracking-tight text-foreground sm:text-4xl transition duration-700 ${
              inView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
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

        <ol className="mt-14 grid gap-10 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className={`relative text-center sm:text-left transition duration-700 ${
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
