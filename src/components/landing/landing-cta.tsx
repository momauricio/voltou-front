'use client';

import { useInView } from '@/components/landing/use-in-view';

export function LandingCta() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section ref={ref} className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div
        className={`relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-foreground px-6 py-12 text-center text-background sm:px-12 sm:py-16 transition duration-700 ${
          inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(45%_0.1_155_/0.4),transparent_55%)]"
        />
        <h2 className="relative text-2xl font-bold tracking-tight sm:text-3xl sm:leading-tight">
          Comece hoje. Se em 30 dias não recuperar pelo menos 2 vendas, você
          cancela.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-sm text-background/70">
          Você só paga quando a gente recupera. Sem cartão pra criar a conta.
          Você controla o que sai no WhatsApp.
        </p>
        <a
          href="/entrar?tab=criar"
          className="relative mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          Criar conta e cadastrar a 1ª venda
          <span aria-hidden>→</span>
        </a>
        <p className="relative mt-3 text-xs text-background/50">
          Leva ~2 minutos · sem mensalidade · sem cartão
        </p>
      </div>
    </section>
  );
}
