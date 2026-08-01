const CHIPS = [
  { n: '1', title: 'Conta grátis', body: 'Sem cartão pra começar' },
  { n: '2', title: 'Venda recuperada', body: 'Cliente paga no link' },
  { n: '3', title: 'Comissão só aí', body: 'Você paga quando entra' },
];

export function PricingChipsMock() {
  return (
    <ol className="mx-auto flex w-full max-w-md flex-col gap-3">
      {CHIPS.map((chip, i) => (
        <li
          key={chip.n}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-soft)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {chip.n}
          </span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-foreground">{chip.title}</p>
            <p className="text-xs text-muted-foreground">{chip.body}</p>
          </div>
          {i < CHIPS.length - 1 ? (
            <span
              aria-hidden
              className="ml-auto hidden text-muted-foreground sm:inline"
            >
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
