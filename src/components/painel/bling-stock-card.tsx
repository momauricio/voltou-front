'use client';

/**
 * Card Bling — fase atual: "Em breve".
 * A API OAuth/sync permanece no backend para reativar depois.
 */
export function BlingStockCard({
  tenantId: _tenantId,
  storeId: _storeId,
  onSynced: _onSynced,
}: {
  tenantId: string | null;
  storeId: string | null;
  onSynced?: (summary: unknown) => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Bling
            </h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Em breve
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A sincronização automática com o Bling chega em breve. Enquanto
            isso, use <span className="font-medium text-foreground">Importar dados</span>{' '}
            com a planilha do seu PDV ou ERP.
          </p>
        </div>
      </div>
    </div>
  );
}
