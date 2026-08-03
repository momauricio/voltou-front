const ITEMS = [
  'Sem mensalidade',
  'Sem cartão pra abrir conta',
  'Sem taxa fixa mensal',
  'Só comissão — na venda que não aconteceria sem a Voltou',
] as const;

/**
 * Single list: zero fixed cost → commission only on incremental recovered sale (RCD).
 */
export function PricingChipsMock() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <ul className="space-y-4">
          {ITEMS.map((item, i) => {
            const isLast = i === ITEMS.length - 1;
            return (
              <li
                key={item}
                className={`flex items-start gap-3 text-sm sm:text-[15px] ${
                  isLast
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isLast
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isLast ? '✓' : '·'}
                </span>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
