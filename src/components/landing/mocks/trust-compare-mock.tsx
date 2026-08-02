export function TrustCompareMock() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-[var(--shadow-lift)] ring-1 ring-primary/10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            V
          </span>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-foreground">
              Voltou Calçados
            </p>
            <p className="text-[11px] text-primary">WhatsApp que o cliente já tem</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-[#005c4b] px-3 py-2.5 text-left text-xs leading-relaxed text-white">
          Oi! Cupom no produto que combina com o que você levou. Pague no link
          quando quiser.
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Sem número novo · sem parecer mensagem de desconhecido
        </p>
      </div>
    </div>
  );
}
