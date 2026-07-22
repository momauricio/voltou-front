'use client';

import { useEffect } from 'react';
import { StoreBrandMark } from '@/components/checkout/store-brand-mark';
import {
  checkoutFontLinkHref,
  resolveCheckoutFont,
  type CheckoutBranding,
} from '@/lib/checkout-branding';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export type CheckoutPreviewProps = {
  storeName: string;
  productName: string;
  amountCents: number;
  customerName?: string;
  branding: CheckoutBranding;
  /** pending | paid | expired | preview */
  status?: 'pending' | 'paid' | 'expired' | 'preview';
  initPoint?: string | null;
  provider?: string;
  paying?: boolean;
  onPay?: () => void;
  /** Compact card for painel preview */
  compact?: boolean;
};

export function CheckoutPreview({
  storeName,
  productName,
  amountCents,
  customerName,
  branding,
  status = 'preview',
  initPoint = null,
  provider = 'mercadopago',
  paying = false,
  onPay,
  compact = false,
}: CheckoutPreviewProps) {
  const font = resolveCheckoutFont(branding.fontFamily);
  const primary = branding.primaryColor?.trim() || '#0F766E';
  const secondary = branding.secondaryColor?.trim() || '#F0FDFA';
  const message =
    branding.message?.trim() ||
    'Pagamento seguro processado pela Voltou.';

  useEffect(() => {
    const href = checkoutFontLinkHref(branding.fontFamily);
    if (!href) return;
    const id = `checkout-font-${branding.fontFamily ?? 'geist'}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [branding.fontFamily]);

  const isPaid = status === 'paid';
  const isExpired = status === 'expired';
  const isPreview = status === 'preview';
  const canPay = Boolean(initPoint) && !isPaid && !isExpired && !isPreview;

  return (
    <div
      className={
        compact
          ? 'rounded-2xl border border-border p-4'
          : 'flex min-h-0 flex-col items-center justify-center px-4 py-8'
      }
      style={{
        fontFamily: font.cssFamily,
        background: compact
          ? `linear-gradient(160deg, ${secondary} 0%, #ffffff 55%)`
          : `linear-gradient(160deg, ${secondary} 0%, #ffffff 48%, ${secondary} 100%)`,
      }}
    >
      <StoreBrandMark
        storeName={storeName}
        logoUrl={branding.logoUrl}
        primaryColor={primary}
        className={compact ? 'mb-4' : 'mb-8'}
        imageClassName={
          compact ? 'h-8 max-w-[140px]' : 'h-10 max-w-[180px]'
        }
      />

      <div
        className={`w-full overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[var(--shadow-soft)] ${compact ? 'max-w-none' : 'max-w-md'}`}
      >
        <div
          className="border-b border-black/5 px-5 py-4"
          style={{ boxShadow: `inset 0 3px 0 ${primary}` }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: primary }}
          >
            {storeName}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">
            Finalize sua compra
          </h1>
          {(branding.message || isPreview) && (
            <p className="mt-2 text-sm text-neutral-500">{message}</p>
          )}
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Produto</span>
            <span className="font-medium text-neutral-900">{productName}</span>
          </div>
          <div className="flex justify-between border-t border-black/5 pt-3">
            <span className="text-sm text-neutral-500">Total</span>
            <span className="text-2xl font-semibold" style={{ color: primary }}>
              {formatCurrency(amountCents)}
            </span>
          </div>
        </div>

        <div className="border-t border-black/5 px-5 py-4">
          {isPaid ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-medium text-neutral-900">
                Pagamento confirmado!
              </p>
            </div>
          ) : isExpired ? (
            <div className="rounded-xl border border-black/10 bg-neutral-50 p-4 text-center text-sm text-neutral-600">
              Link expirado
            </div>
          ) : canPay ? (
            <button
              type="button"
              disabled={paying}
              onClick={onPay}
              className="flex h-12 w-full items-center justify-center rounded-xl text-base font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {paying
                ? 'Redirecionando…'
                : `Pagar ${formatCurrency(amountCents)}`}
            </button>
          ) : isPreview ? (
            <button
              type="button"
              disabled
              className="flex h-12 w-full cursor-default items-center justify-center rounded-xl text-base font-semibold text-white opacity-90"
              style={{ backgroundColor: primary }}
            >
              Pagar {formatCurrency(amountCents)}
            </button>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
              Pagamento ainda não disponível. A loja precisa conectar o Mercado
              Pago no painel.
            </div>
          )}
          <p className="mt-3 text-center text-xs text-neutral-500">
            {provider === 'mercadopago'
              ? 'Você será redirecionado ao Mercado Pago (Pix, cartão ou boleto).'
              : message}
          </p>
        </div>
      </div>

      {!compact && customerName && (
        <p className="mt-6 text-xs text-neutral-500">
          Processado por Voltou · {customerName}
        </p>
      )}
      {compact && (
        <p className="mt-3 text-center text-[11px] text-neutral-500">
          Preview ao vivo — assim o cliente vê o link `/p/…`
        </p>
      )}
    </div>
  );
}
