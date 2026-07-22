'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StoreBrandMark } from '@/components/checkout/store-brand-mark';
import {
  checkoutFontLinkHref,
  resolveCheckoutFont,
} from '@/lib/checkout-branding';
import {
  getPublicOffer,
  payPublicOffer,
  type PublicOffer,
} from '@/lib/api';
import { safeExternalRedirect } from '@/lib/safe-redirect';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function LojaOfferPage({
  params,
}: {
  params: Promise<{ slug: string; cupom: string }>;
}) {
  const { slug, cupom } = use(params);
  const router = useRouter();
  const [offer, setOffer] = useState<PublicOffer | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getPublicOffer(slug, cupom)
      .then((data) => {
        if (cancelled) return;
        if (data.status === 'paid') {
          router.replace(`/obrigado/${slug}/${cupom}`);
          return;
        }
        setOffer(data);
        setSelectedAddonIds(
          (data.addons ?? [])
            .filter((a) => a.selectedByDefault)
            .map((a) => a.id),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError('Oferta não encontrada');
          router.replace('/');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, cupom, router]);

  useEffect(() => {
    if (!offer) return;
    const href = checkoutFontLinkHref(offer.branding.fontFamily);
    if (!href) return;
    const id = `offer-font-${offer.branding.fontFamily ?? 'geist'}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [offer]);

  async function handlePay() {
    if (!offer || paying) return;
    setPaying(true);
    setError(null);
    try {
      const { checkout_url } = await payPublicOffer(
        slug,
        cupom,
        selectedAddonIds,
      );
      safeExternalRedirect(checkout_url);
    } catch (err) {
      setPaying(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível abrir o pagamento.',
      );
    }
  }

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Carregando oferta…</p>
      </div>
    );
  }

  if (!offer) {
    return null;
  }

  const font = resolveCheckoutFont(offer.branding.fontFamily);
  const primary = offer.branding.primaryColor?.trim() || '#0F766E';
  const secondary = offer.branding.secondaryColor?.trim() || '#F0FDFA';
  const discountPct = Math.round(offer.discountBps / 100);
  const personalMsg =
    offer.branding.message?.trim() ||
    `Oi ${offer.customerFirstName}! Este desconto foi separado só pra você.`;
  const isExpired = offer.status === 'expired';
  const canPay = offer.canPay && !isExpired;
  const addons = offer.addons ?? [];
  const selectedAddons = addons.filter((a) =>
    selectedAddonIds.includes(a.id),
  );
  const liveTotalCents =
    offer.amountCents +
    selectedAddons.reduce((sum, a) => sum + a.amountCents, 0);

  return (
    <div
      className="flex min-h-screen flex-col items-center px-4 py-8"
      style={{
        fontFamily: font.cssFamily,
        background: `linear-gradient(160deg, ${secondary} 0%, #ffffff 48%, ${secondary} 100%)`,
      }}
    >
      <StoreBrandMark
        storeName={offer.storeName}
        logoUrl={offer.branding.logoUrl}
        primaryColor={primary}
        className="mb-6"
      />

      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[var(--shadow-soft)]">
        <div
          className="border-b border-black/5 px-5 py-4"
          style={{ boxShadow: `inset 0 3px 0 ${primary}` }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: primary }}
          >
            {offer.storeName}
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div
            className="flex h-40 items-center justify-center rounded-xl"
            style={{ background: secondary }}
          >
            <p className="px-4 text-center text-lg font-semibold text-neutral-800">
              {offer.productName}
            </p>
          </div>

          <div>
            <p className="text-sm text-neutral-500 line-through">
              De {formatCurrency(offer.listPriceCents)}
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              Por {formatCurrency(offer.amountCents)}
            </p>
            {discountPct > 0 && (
              <p className="mt-1 text-sm font-medium" style={{ color: primary }}>
                ({discountPct}% de desconto)
              </p>
            )}
          </div>

          {offer.couponCode && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: secondary, color: primary }}
            >
              <p className="font-semibold">
                Cupom {offer.couponCode} aplicado
              </p>
              {offer.savingsCents > 0 && (
                <p className="mt-0.5 text-neutral-700">
                  Você economiza {formatCurrency(offer.savingsCents)}
                </p>
              )}
            </div>
          )}

          {addons.length > 0 && (
            <div className="space-y-3">
              <p
                className="text-sm font-semibold text-neutral-900"
              >
                Leve também
              </p>
              <ul className="space-y-2">
                {addons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  const addonPct = Math.round(addon.discountBps / 100);
                  return (
                    <li key={addon.id}>
                      <label
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/5 px-3 py-3 transition hover:bg-neutral-50"
                        style={
                          checked
                            ? { borderColor: `${primary}55`, background: secondary }
                            : undefined
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(addon.id)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300"
                          style={{ accentColor: primary }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-neutral-900">
                            {addon.productName}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
                            <span className="text-neutral-500 line-through">
                              {formatCurrency(addon.listPriceCents)}
                            </span>
                            <span className="font-semibold text-neutral-900">
                              {formatCurrency(addon.amountCents)}
                            </span>
                            {addonPct > 0 && (
                              <span
                                className="text-xs font-medium"
                                style={{ color: primary }}
                              >
                                ({addonPct}% off)
                              </span>
                            )}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-baseline justify-between border-t border-black/5 pt-3">
                <span className="text-sm text-neutral-600">Total</span>
                <span className="text-xl font-bold text-neutral-900">
                  {formatCurrency(liveTotalCents)}
                </span>
              </div>
            </div>
          )}

          <p className="text-sm leading-relaxed text-neutral-600">
            {personalMsg}
          </p>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {isExpired ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
              Esta oferta expirou. Peça um novo link na loja.
            </p>
          ) : (
            <button
              type="button"
              disabled={!canPay || paying}
              onClick={() => void handlePay()}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
              style={{ background: primary }}
            >
              {paying
                ? 'Abrindo pagamento…'
                : addons.length > 0
                  ? `Garantir meu desconto · ${formatCurrency(liveTotalCents)}`
                  : 'Garantir meu desconto'}
            </button>
          )}

          {!canPay && !isExpired && (
            <p className="text-center text-xs text-neutral-500">
              Pagamento temporariamente indisponível. A loja precisa conectar o
              Mercado Pago.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
