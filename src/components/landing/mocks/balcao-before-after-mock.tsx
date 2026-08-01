export function BalcaoBeforeAfterMock() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
          SEM VOLTOU
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Vendeu no balcão</li>
          <li className="line-through opacity-60">Cliente some</li>
          <li className="text-foreground/80">Ninguém vende de novo</li>
        </ul>
        <p className="mt-4 text-xs font-medium text-muted-foreground">
          Segunda venda → R$ 0
        </p>
      </div>

      <div className="rounded-2xl border border-primary/25 bg-accent/40 p-4 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-primary">
          COM VOLTOU
        </p>
        <div className="mt-3 space-y-2 rounded-xl border border-border/80 bg-card p-3 text-left text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground">Nome</p>
            <p className="font-medium text-foreground">Marina Silva</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">WhatsApp</p>
            <p className="font-medium text-foreground">(11) 9····-····</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Produto</p>
            <p className="font-medium text-foreground">Tênis Nike Run</p>
          </div>
          <div className="rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground">
            Salvar · 30s
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-primary">
          IA recupera + cupom
        </p>
      </div>
    </div>
  );
}
