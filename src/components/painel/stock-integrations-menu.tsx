'use client';

import { useEffect, useRef, useState } from 'react';

type StockProvider = {
  id: string;
  name: string;
  soon: boolean;
};

const STOCK_PROVIDERS: StockProvider[] = [
  { id: 'bling', name: 'Bling', soon: true },
  { id: 'tiny', name: 'Tiny ERP', soon: true },
  { id: 'shopify', name: 'Shopify', soon: true },
];

/** Menu de integrações de estoque — Bling/outros em breve; foque na planilha. */
export function StockIntegrationsMenu({
  tenantId: _tenantId,
  storeId: _storeId,
  onSynced: _onSynced,
}: {
  tenantId: string | null;
  storeId: string | null;
  onSynced?: (summary: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        Integrações
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]">
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Estoque / ERP
          </p>
          <ul className="space-y-0.5">
            {STOCK_PROVIDERS.map((p) => (
              <li key={p.id}>
                <div className="flex items-center justify-between rounded-lg px-2 py-2.5 text-sm">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Em breve
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-1 border-t border-border px-2 py-2 text-xs text-muted-foreground">
            Por enquanto, importe o catálogo por planilha CSV ou Excel.
          </p>
        </div>
      )}
    </div>
  );
}
