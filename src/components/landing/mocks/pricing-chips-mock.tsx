const NO_PAY = [
  'Mensalidade',
  'Cartão pra abrir conta',
  'Taxa fixa mensal',
] as const;

const ONLY_THEN = [
  'Comissão na venda recuperada',
  'Quando o cliente paga no link',
  'Se a venda não entra, comissão não entra',
] as const;

export function PricingChipsMock() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="grid sm:grid-cols-2">
          <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
              NÃO PAGA
            </p>
            <ul className="mt-4 space-y-3">
              {NO_PAY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground sm:text-[15px]"
                >
                  <span aria-hidden className="mt-0.5 text-muted-foreground/70">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-accent/40 p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-primary">
              SÓ PAGA AÍ
            </p>
            <ul className="mt-4 space-y-3">
              {ONLY_THEN.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-foreground sm:text-[15px]"
                >
                  <span aria-hidden className="mt-0.5 text-primary">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="border-t border-border px-5 py-3 text-center text-xs font-medium text-muted-foreground sm:text-sm">
          Comissão só na venda que não aconteceria sozinha.
        </p>
      </div>
    </div>
  );
}
