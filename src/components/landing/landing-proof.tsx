'use client';

import { useInView } from '@/components/landing/use-in-view';

export type RecoveryStats = {
  recoveredCents: number;
  salesCount: number;
  periodLabel: string;
};

export type MerchantQuote = {
  quote: string;
  merchantName: string;
  storeName: string;
  /** Optional path under /public when available */
  photoSrc?: string;
};

type LandingProofProps = {
  /** Real numbers when available — leave undefined for honest validation state */
  stats?: RecoveryStats | null;
  /** Real merchant quote only — leave undefined for empty placeholder */
  quote?: MerchantQuote | null;
};

function formatBrlFromCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

/** Placeholder realista até haver depoimento autorizado — substituir. */
const PLACEHOLDER_QUOTE: MerchantQuote = {
  merchantName: 'Carla Mendes',
  storeName: 'Carla Calçados · Campinas, SP',
  quote:
    'Eu sabia que a cliente levava o tênis e sumia. Agora cadastro no balcão e a Voltou manda a oferta no WhatsApp da loja. Quando paga, eu só preparo a retirada — sem ficar cobrando no zap o dia inteiro.',
};

/**
 * Social proof / results.
 * // TODO: inserir números reais de recuperação assim que disponíveis
 * // TODO: trocar PLACEHOLDER_QUOTE por depoimento autorizado (nome, loja, foto)
 */
export function LandingProof({
  stats = null,
  quote = PLACEHOLDER_QUOTE,
}: LandingProofProps) {
  const { ref, inView } = useInView<HTMLElement>();
  const hasStats = Boolean(stats && stats.salesCount > 0);

  return (
    <section
      id="resultado"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl transition duration-700 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Resultados das lojas
        </h2>
        <p
          className={`mx-auto mt-4 max-w-xl text-muted-foreground transition duration-700 delay-100 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          Números de recuperação entram aqui quando tivermos dados de lojas
          parceiras. Abaixo, o que um lojista costuma viver no dia a dia.
        </p>
      </div>

      <div
        className={`mx-auto mt-10 max-w-xl transition duration-700 delay-150 ${
          inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        {hasStats && stats ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-left shadow-[var(--shadow-soft)] sm:p-8">
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground">
              {stats.periodLabel}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {formatBrlFromCents(stats.recoveredCents)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.salesCount}{' '}
              {stats.salesCount === 1 ? 'venda recuperada' : 'vendas recuperadas'}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <p className="text-base font-medium text-foreground">
              Em fase de validação com lojas parceiras
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Assim que tivermos números reais de recuperação, publicamos aqui —
              sem inventar resultado.
            </p>
            {/* TODO: inserir números reais de recuperação assim que disponíveis */}
          </div>
        )}
      </div>

      <div
        className={`mx-auto mt-10 max-w-xl transition duration-700 delay-200 ${
          inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {quote?.quote && quote.merchantName ? (
          <blockquote className="rounded-2xl border border-border bg-card px-6 py-5 text-left shadow-[var(--shadow-soft)]">
            <p className="text-sm leading-relaxed text-foreground sm:text-[15px]">
              “{quote.quote}”
            </p>
            <footer className="mt-4 flex items-center gap-3">
              {quote.photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={quote.photoSrc}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                >
                  {quote.merchantName.charAt(0)}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {quote.merchantName}
                </p>
                <p className="text-xs text-muted-foreground">{quote.storeName}</p>
              </div>
            </footer>
          </blockquote>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-5 text-left text-sm text-muted-foreground">
            {/* TODO: preencher com depoimento real autorizado */}
            <p className="font-medium text-foreground/80">
              [DEPOIMENTO] Nome do lojista · Nome da loja
            </p>
            <p className="mt-2">
              “[Texto do depoimento real — não inventar]”
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
