'use client';

/**
 * Hero — Visor-inspired: one clear product phone, no overlapping “story” chrome.
 * Copy stays problem-aware (RCD / Schwartz).
 */
export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,oklch(92%_0.07_150_/0.85),transparent_60%),radial-gradient(ellipse_50%_40%_at_90%_20%,oklch(94%_0.04_180_/0.5),transparent_50%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-reveal text-sm font-medium text-primary">
            O vendedor WhatsApp da loja física
          </p>

          <h1 className="landing-reveal landing-reveal-delay-0 mt-4 text-[2.05rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
            Todo mês você deixa{' '}
            <span className="relative inline-block text-primary">
              dinheiro na mesa
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
            : clientes que já compraram ou quiseram comprar — e ninguém vende de
            novo pra eles.
          </h1>

          <p className="landing-reveal landing-reveal-delay-1 mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            O Voltou. é o vendedor no WhatsApp: recupera essas vendas e ainda
            sobe o ticket com cupom, oferta e upsell. Você só paga comissão
            quando o dinheiro entra.
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
                Só comissão em venda recuperada · sem mensalidade · sem cartão ·
                ~2 min
              </p>
            </div>
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Ver como funciona
            </a>
          </div>
        </div>

        {/* Product visual: readable WhatsApp thread — Visor-style phone */}
        <div className="landing-reveal landing-reveal-delay-1 relative mx-auto mt-14 w-full max-w-[340px] sm:mt-16">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-[#0b141a] shadow-[var(--shadow-lift)] ring-1 ring-black/5">
            {/* WhatsApp chrome */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-[#1f2c34] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                V
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-white">
                  Calçados do Bairro
                </p>
                <p className="text-[11px] text-white/55">online</p>
              </div>
            </div>

            <div className="space-y-3 bg-[#0b141a] px-3 py-4">
              <p className="text-center text-[10px] text-white/40">Hoje</p>

              <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-left text-[13px] leading-snug text-white shadow-sm">
                Oi Marina! O tênis Nike Run que você levou — e a meia técnica
                que combina com ele.
                <br />
                <br />
                Cupom{' '}
                <span className="font-semibold tracking-wide">VOLTOU12</span>
                + meia com desconto. Pague no link e retire ou receba em casa 👟
                <span className="mt-1 block text-right text-[10px] text-white/55">
                  10:42 ✓✓
                </span>
              </div>

              <div className="mr-auto max-w-[75%] rounded-2xl rounded-tl-sm bg-[#1f2c34] px-3 py-2 text-left text-[13px] leading-snug text-white shadow-sm">
                Paguei! Quero retirar amanhã 💚
                <span className="mt-1 block text-right text-[10px] text-white/45">
                  10:44
                </span>
              </div>

              <div className="mx-auto w-fit rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
                Pago · +R$ 329 recuperados
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Você só paga comissão
            </span>{' '}
            quando a venda entra.
          </p>
        </div>
      </div>
    </section>
  );
}
