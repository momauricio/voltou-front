'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { StoreBrandMark } from '@/components/checkout/store-brand-mark';
import { getPublicOfferStatus, type PublicOfferStatus } from '@/lib/api';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function ObrigadoPage({
  params,
}: {
  params: Promise<{ slug: string; cupom: string }>;
}) {
  const { slug, cupom } = use(params);
  const [status, setStatus] = useState<PublicOfferStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getPublicOfferStatus(slug, cupom)
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, cupom]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Confirmando compra…</p>
      </div>
    );
  }

  const paid = status?.status === 'paid';
  const savings =
    status == null
      ? 0
      : status.paidLines && status.paidLines.length > 0
        ? Math.max(
            0,
            status.paidLines.reduce((sum, line) => sum + line.listPriceCents, 0) -
              status.paidLines.reduce((sum, line) => sum + line.amountCents, 0),
          )
        : Math.max(0, status.listPriceCents - status.amountCents);
  const primary = status?.branding?.primaryColor?.trim() || '#0F766E';
  const secondary = status?.branding?.secondaryColor?.trim() || '#F0FDFA';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={{
        background: `linear-gradient(160deg, ${secondary} 0%, #ffffff 55%)`,
      }}
    >
      <StoreBrandMark
        storeName={status?.storeName ?? 'Loja'}
        logoUrl={status?.branding?.logoUrl}
        primaryColor={primary}
        className="mb-8"
      />
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: primary }}
        >
          {status?.storeName ?? 'Loja'}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {paid ? 'Compra confirmada!' : 'Quase lá…'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {paid
            ? `Seu pedido está com ${status?.storeName}.`
            : 'Ainda não confirmamos o pagamento. Se você já pagou, aguarde alguns segundos.'}
        </p>

        {status && (
          <div className="mt-6 space-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            {status.paidLines && status.paidLines.length > 0 ? (
              <>
                {status.paidLines.map((line, index) => (
                  <div
                    key={`${line.kind}-${line.productId}-${index}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-muted-foreground text-right sm:text-left">
                      {line.productNameSnapshot}
                    </span>
                    <span className="shrink-0 font-medium text-foreground">
                      {formatCurrency(line.amountCents)}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Produto</span>
                <span className="font-medium text-foreground text-right">
                  {status.productName}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-border/60 pt-2">
              <span className="text-muted-foreground">Valor pago</span>
              <span className="font-medium text-foreground">
                {formatCurrency(status.amountCents)}
              </span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Desconto</span>
                <span className="font-medium" style={{ color: primary }}>
                  {formatCurrency(savings)}
                </span>
              </div>
            )}
            {status.couponCode && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Cupom</span>
                <span className="font-medium text-foreground">
                  {status.couponCode}
                </span>
              </div>
            )}
          </div>
        )}

        {!paid && (
          <Link
            href={`/aguardando/${slug}/${cupom}`}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white"
            style={{ background: primary }}
          >
            Acompanhar pagamento
          </Link>
        )}
      </div>
    </div>
  );
}
