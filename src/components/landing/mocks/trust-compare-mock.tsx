export function TrustCompareMock() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4 opacity-70 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            ?
          </span>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-foreground">
              +55 11 9····-····
            </p>
            <p className="text-[11px] text-muted-foreground">Desconhecido</p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
          Oi sumida! Passando pra oferecer…
        </p>
        <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
          ✕ Cliente desconfia
        </p>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-card p-4 shadow-[var(--shadow-lift)] ring-1 ring-primary/10">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            V
          </span>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-foreground">
              Calçados do Bairro
            </p>
            <p className="text-[11px] text-primary">WhatsApp da loja</p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-[#005c4b] px-3 py-2 text-left text-xs text-white">
          Marina, cupom VOLTOU12 no tênis + meia. Pague no link.
        </p>
        <p className="mt-3 text-center text-xs font-medium text-primary">
          ✓ Cliente reconhece a loja
        </p>
      </div>
    </div>
  );
}
