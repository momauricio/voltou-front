'use client';

import { useInView } from '@/components/landing/use-in-view';

const ANGLES = [
  {
    title: 'Os dois',
    body: 'Quem levou a peça. Quem experimentou, gostou, deixou o número. Os dois já passaram no seu balcão. A Voltou oferece a condição e fecha. Lucro em cima de quem já entrou na sua loja.',
  },
  {
    title: 'Cupom no nome',
    body: 'O cliente da sua loja recebe cupom com o nome e uma condição especial. Atendimento requintado. A Voltou fecha a 2ª venda. Você lucra. A loja continua sendo a da sua cliente.',
  },
  {
    title: 'Já está na arara',
    body: 'A peça já está no estoque. Paga. Parada na arara. Você atende a fila. A Voltou fecha a 2ª venda. Lucro em cima do que você já tem, sem sair do balcão.',
  },
] as const;

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
        {ANGLES.map((angle) => (
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
