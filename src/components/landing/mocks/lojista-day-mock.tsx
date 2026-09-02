const AGENDA_ITEMS = [
  'Pagar contas',
  'Comprar produto certo',
  'Gerenciar a equipe',
  'Controlar estoque',
  'Pensar em campanha pra vender mais',
] as const;

const ASSET_CHIPS = ['Nome', 'WhatsApp', 'Interesse'] as const;

export function LojistaDayMock() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
          HOJE NA LOJA
        </p>
        <ul className="mt-4 space-y-3">
          {AGENDA_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-foreground sm:text-[15px]">
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="my-4 border-t border-border/80" />
        <p className="text-sm text-muted-foreground">
          WhatsApp de quem já se interessou → ninguém cuida
        </p>
      </div>

      <div className="mt-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {ASSET_CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]"
            >
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Na mão — e a venda some mesmo assim.
        </p>
      </div>
    </div>
  );
}
