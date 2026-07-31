'use client';

/**
 * Hero — 1º viewport: copy curta + CTA only (mock abaixo do fold).
 */
export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,oklch(92%_0.07_150_/0.85),transparent_60%),radial-gradient(ellipse_50%_40%_at_90%_20%,oklch(94%_0.04_180_/0.5),transparent_50%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-reveal text-sm font-medium text-primary">
            Recuperamos as vendas que você perde todo dia
          </p>

          <h1 className="landing-reveal landing-reveal-delay-0 mt-4 text-[2.05rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
            Clientes compram uma vez — e ninguém vende de novo pra eles.
          </h1>

          <p className="landing-reveal landing-reveal-delay-1 mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A Voltou recupera e vende pra esses clientes que compraram só uma
            vez na sua loja. A IA escolhe o produto, personaliza o cupom e fecha
            no WhatsApp da loja.
          </p>

          <div className="landing-reveal landing-reveal-delay-1 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
            <div>
              <a
                href="/entrar?tab=criar"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                Recuperar minha primeira venda
                <span aria-hidden>→</span>
              </a>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Sem mensalidade · sem cartão · só comissão · ~2 min
              </p>
            </div>
            <a
              href="#fluxo"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
