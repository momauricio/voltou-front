'use client';

/**
 * Hero — dor (nunca mais voltaram) + CTA único + comissão em destaque.
 */
export function LandingHero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,oklch(92%_0.07_150_/0.85),transparent_60%),radial-gradient(ellipse_50%_40%_at_90%_20%,oklch(94%_0.04_180_/0.5),transparent_50%)]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-reveal text-sm font-medium text-primary">
            Recuperamos as vendas que você perde todo dia
          </p>

          <h1 className="landing-reveal landing-reveal-delay-0 mt-4 text-[2.05rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
            Seus clientes compraram na sua loja — e{' '}
            <span className="relative inline-block text-primary">
              nunca mais voltaram
              <svg
                aria-hidden
                className="pointer-events-none absolute -bottom-1 left-0 h-3 w-full text-primary/70 sm:-bottom-1.5 sm:h-3.5"
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8c40-6 80-8 120-4s56 6 76 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>

          <p className="landing-reveal landing-reveal-delay-1 mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Nós recuperamos e vendemos de novo pra esse cliente.
          </p>

          <div className="landing-reveal landing-reveal-delay-1 mt-8 flex flex-col items-center">
            <a
              href="/entrar?tab=criar"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Recuperar minha primeira venda
              <span aria-hidden>→</span>
            </a>
            <p className="mt-4 max-w-md text-center text-sm font-medium leading-snug text-foreground">
              Sem mensalidade. Sem cartão.{' '}
              <span className="text-primary">
                Só comissão na venda que não aconteceria sozinha.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
