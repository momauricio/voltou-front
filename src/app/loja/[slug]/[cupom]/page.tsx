'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { StoreBrandMark } from '@/components/checkout/store-brand-mark';
import type { CheckoutShippingAddress } from '@/components/checkout/transparent-checkout-brick';
import {
  checkoutFontLinkHref,
  resolveCheckoutFont,
} from '@/lib/checkout-branding';
import {
  getPublicOffer,
  type PublicOffer,
  type TransparentPaymentResult,
} from '@/lib/api';

const TransparentCheckoutBrick = dynamic(
  () =>
    import('@/components/checkout/transparent-checkout-brick').then(
      (m) => m.TransparentCheckoutBrick,
    ),
  { ssr: false, loading: () => (
    <p className="py-6 text-center text-sm text-neutral-500">
      Carregando pagamento…
    </p>
  ) },
);

const EMPTY_ADDRESS: CheckoutShippingAddress = {
  recipientName: '',
  phoneE164: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

const addressFieldClass =
  'mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-black/5';

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
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    'pickup' | 'delivery'
  >('pickup');
  const [shippingAddress, setShippingAddress] =
    useState<CheckoutShippingAddress>(EMPTY_ADDRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pixPending, setPixPending] = useState<TransparentPaymentResult | null>(
    null,
  );

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
        setFulfillmentMethod('pickup');
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

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
    setPixPending(null);
  }

  function updateAddressField<K extends keyof CheckoutShippingAddress>(
    key: K,
    value: CheckoutShippingAddress[K],
  ) {
    setShippingAddress((prev) => ({ ...prev, [key]: value }));
    setPixPending(null);
  }

  function selectFulfillment(method: 'pickup' | 'delivery') {
    setFulfillmentMethod(method);
    setPixPending(null);
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
  const canPay = offer.canPay && !isExpired && Boolean(offer.mpPublicKey);
  const addons = offer.addons ?? [];
  const selectedAddons = addons.filter((a) =>
    selectedAddonIds.includes(a.id),
  );
  const productsCents =
    offer.amountCents +
    selectedAddons.reduce((sum, a) => sum + a.amountCents, 0);
  const shippingCents =
    fulfillmentMethod === 'delivery' ? offer.shippingCents : 0;
  const chargeCents = productsCents + shippingCents;
  const deliveryAvailable = offer.deliveryEnabled;

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
              <p className="text-sm font-semibold text-neutral-900">
                Leve também
              </p>
              <ul className="space-y-2">
                {addons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  const addonPct = Math.round(addon.discountBps / 100);
                  return (
                    <li key={addon.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                          checked
                            ? 'border-current bg-black/[0.02]'
                            : 'border-black/10'
                        }`}
                        style={checked ? { color: primary } : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(addon.id)}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-neutral-900">
                            {addon.productName}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
                            <span className="text-neutral-400 line-through">
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
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-neutral-900">
              Como você quer receber?
            </p>
            <div className="grid gap-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                  fulfillmentMethod === 'pickup'
                    ? 'border-current bg-black/[0.02]'
                    : 'border-black/10'
                }`}
                style={
                  fulfillmentMethod === 'pickup' ? { color: primary } : undefined
                }
              >
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillmentMethod === 'pickup'}
                  onChange={() => selectFulfillment('pickup')}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-neutral-900">
                    Retirar na loja
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    Pague agora e retire na loja
                  </span>
                </span>
              </label>
              {deliveryAvailable && (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                    fulfillmentMethod === 'delivery'
                      ? 'border-current bg-black/[0.02]'
                      : 'border-black/10'
                  }`}
                  style={
                    fulfillmentMethod === 'delivery'
                      ? { color: primary }
                      : undefined
                  }
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillmentMethod === 'delivery'}
                    onChange={() => selectFulfillment('delivery')}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-neutral-900">
                      Receber em casa
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      Pague agora e receba em casa
                      {offer.shippingCents > 0
                        ? ` · frete ${formatCurrency(offer.shippingCents)}`
                        : ' · frete grátis'}
                    </span>
                  </span>
                </label>
              )}
            </div>

            {fulfillmentMethod === 'pickup' && offer.pickupAddressText && (
              <p className="rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">Retirada: </span>
                {offer.pickupAddressText}
              </p>
            )}

            {fulfillmentMethod === 'delivery' && (
              <div className="space-y-3 rounded-xl border border-black/5 bg-neutral-50/80 p-3">
                <p className="text-sm font-semibold text-neutral-900">
                  Endereço de entrega
                </p>
                <label className="block text-xs font-medium text-neutral-600">
                  Nome de quem recebe
                  <input
                    className={addressFieldClass}
                    value={shippingAddress.recipientName}
                    onChange={(e) =>
                      updateAddressField('recipientName', e.target.value)
                    }
                    autoComplete="name"
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-600">
                  WhatsApp / telefone
                  <input
                    className={addressFieldClass}
                    value={shippingAddress.phoneE164}
                    onChange={(e) =>
                      updateAddressField('phoneE164', e.target.value)
                    }
                    placeholder="+5511999999999"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-neutral-600">
                    CEP
                    <input
                      className={addressFieldClass}
                      value={shippingAddress.cep}
                      onChange={(e) =>
                        updateAddressField('cep', e.target.value)
                      }
                      inputMode="numeric"
                      autoComplete="postal-code"
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    UF
                    <input
                      className={addressFieldClass}
                      value={shippingAddress.state}
                      onChange={(e) =>
                        updateAddressField(
                          'state',
                          e.target.value.slice(0, 2).toUpperCase(),
                        )
                      }
                      maxLength={2}
                      autoComplete="address-level1"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-neutral-600">
                  Rua
                  <input
                    className={addressFieldClass}
                    value={shippingAddress.street}
                    onChange={(e) =>
                      updateAddressField('street', e.target.value)
                    }
                    autoComplete="street-address"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-neutral-600">
                    Número
                    <input
                      className={addressFieldClass}
                      value={shippingAddress.number}
                      onChange={(e) =>
                        updateAddressField('number', e.target.value)
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    Complemento
                    <input
                      className={addressFieldClass}
                      value={shippingAddress.complement ?? ''}
                      onChange={(e) =>
                        updateAddressField('complement', e.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-neutral-600">
                  Bairro
                  <input
                    className={addressFieldClass}
                    value={shippingAddress.neighborhood}
                    onChange={(e) =>
                      updateAddressField('neighborhood', e.target.value)
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-600">
                  Cidade
                  <input
                    className={addressFieldClass}
                    value={shippingAddress.city}
                    onChange={(e) =>
                      updateAddressField('city', e.target.value)
                    }
                    autoComplete="address-level2"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1.5 border-t border-black/5 pt-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-600">Produtos</span>
              <span className="font-medium text-neutral-900">
                {formatCurrency(productsCents)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-600">Frete</span>
              <span className="font-medium text-neutral-900">
                {fulfillmentMethod === 'delivery'
                  ? shippingCents > 0
                    ? formatCurrency(shippingCents)
                    : 'Grátis'
                  : formatCurrency(0)}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-semibold text-neutral-900">
                Total
              </span>
              <span className="text-xl font-bold text-neutral-900">
                {formatCurrency(chargeCents)}
              </span>
            </div>
          </div>

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
          ) : pixPending ? (
            <div className="space-y-3 rounded-xl border border-black/5 bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-900">
                Pix gerado — pague para confirmar
              </p>
              {pixPending.pixQrCodeBase64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${pixPending.pixQrCodeBase64}`}
                  alt="QR Code Pix"
                  className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
                />
              )}
              {pixPending.pixQrCode && (
                <button
                  type="button"
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700"
                  onClick={() =>
                    void navigator.clipboard.writeText(pixPending.pixQrCode!)
                  }
                >
                  Copiar código Pix
                </button>
              )}
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white"
                style={{ background: primary }}
                onClick={() =>
                  router.push(`/aguardando/${slug}/${cupom}`)
                }
              >
                Já paguei — acompanhar
              </button>
            </div>
          ) : canPay && offer.mpPublicKey ? (
            <TransparentCheckoutBrick
              publicKey={offer.mpPublicKey}
              amountCents={chargeCents}
              storeSlug={slug}
              coupon={cupom}
              selectedAddonIds={selectedAddonIds}
              fulfillmentMethod={fulfillmentMethod}
              shippingAddress={
                fulfillmentMethod === 'delivery' ? shippingAddress : undefined
              }
              primaryColor={primary}
              onApproved={() => router.push(`/obrigado/${slug}/${cupom}`)}
              onPending={(result) => {
                if (result.pixQrCode || result.pixQrCodeBase64) {
                  setPixPending(result);
                } else {
                  router.push(`/aguardando/${slug}/${cupom}`);
                }
              }}
              onError={(message) => setError(message)}
            />
          ) : (
            <p className="text-center text-xs text-neutral-500">
              Pagamento temporariamente indisponível. A loja precisa conectar o
              Mercado Pago (e liberar a chave pública da conta).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
