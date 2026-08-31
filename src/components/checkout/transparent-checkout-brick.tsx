'use client';

import { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import {
  createTransparentOfferPayment,
  type TransparentPaymentResult,
} from '@/lib/api';
import {
  MP_BRICK_LOAD_ERROR,
  MP_BRICK_LOAD_TIMEOUT_MS,
  isMercadoPagoResource,
} from '@/lib/mp-brick-load';

export type CheckoutShippingAddress = {
  recipientName: string;
  phoneE164: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

type Props = {
  publicKey: string;
  amountCents: number;
  storeSlug: string;
  coupon: string;
  selectedAddonIds: string[];
  fulfillmentMethod: 'pickup' | 'delivery';
  shippingAddress?: CheckoutShippingAddress;
  primaryColor: string;
  onApproved: () => void;
  onPending: (result: TransparentPaymentResult) => void;
  onError: (message: string) => void;
};

function isShippingAddressComplete(
  address: CheckoutShippingAddress | undefined,
): boolean {
  if (!address) return false;
  const cepDigits = address.cep.replace(/\D/g, '');
  return Boolean(
    address.recipientName.trim() &&
      address.phoneE164.trim() &&
      cepDigits.length === 8 &&
      address.street.trim() &&
      address.number.trim() &&
      address.neighborhood.trim() &&
      address.city.trim() &&
      address.state.trim().length === 2,
  );
}

/** Fingerprint so Payment Brick remounts when the delivery address changes. */
function shippingAddressKey(
  address: CheckoutShippingAddress | undefined,
): string {
  if (!address) return 'none';
  return [
    address.recipientName.trim(),
    address.phoneE164.trim(),
    address.cep.replace(/\D/g, ''),
    address.street.trim(),
    address.number.trim(),
    address.complement?.trim() ?? '',
    address.neighborhood.trim(),
    address.city.trim(),
    address.state.trim().toUpperCase(),
  ].join('|');
}

/**
 * Payment Brick: cartão + Pix (sem boleto).
 * customization.paymentMethods omite `ticket` de propósito.
 */
export function TransparentCheckoutBrick({
  publicKey,
  amountCents,
  storeSlug,
  coupon,
  selectedAddonIds,
  fulfillmentMethod,
  shippingAddress,
  primaryColor,
  onApproved,
  onPending,
  onError,
}: Props) {
  const [initialized, setInitialized] = useState(false);
  const [brickReady, setBrickReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const amount = Number((amountCents / 100).toFixed(2));
  const deliveryBlocked =
    fulfillmentMethod === 'delivery' &&
    !isShippingAddressComplete(shippingAddress);
  const payHint =
    fulfillmentMethod === 'delivery'
      ? 'Pague agora e receba em casa'
      : 'Pague agora e retire na loja';

  useEffect(() => {
    initMercadoPago(publicKey, { locale: 'pt-BR' });
    setInitialized(true);
    setBrickReady(false);
    setLoadError(null);

    const fail = () => setLoadError(MP_BRICK_LOAD_ERROR);

    const onViolation = (event: SecurityPolicyViolationEvent) => {
      if (isMercadoPagoResource(event.blockedURI ?? '')) fail();
    };
    document.addEventListener('securitypolicyviolation', onViolation);

    let script: HTMLScriptElement | null = null;
    const onScriptError = () => fail();
    const attachScriptError = () => {
      script = document.querySelector(
        'script[src*="sdk.mercadopago.com"]',
      );
      script?.addEventListener('error', onScriptError);
    };
    attachScriptError();
    const findTimer = window.setTimeout(attachScriptError, 0);

    const timeout = window.setTimeout(() => {
      if (!('MercadoPago' in window)) fail();
    }, MP_BRICK_LOAD_TIMEOUT_MS);

    return () => {
      document.removeEventListener('securitypolicyviolation', onViolation);
      script?.removeEventListener('error', onScriptError);
      window.clearTimeout(findTimer);
      window.clearTimeout(timeout);
    };
  }, [publicKey]);

  if (amount <= 0) return null;

  if (deliveryBlocked) {
    return (
      <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
        <div
          className="border-b border-black/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: primaryColor }}
        >
          {payHint}
        </div>
        <p className="px-3 py-4 text-sm text-neutral-600">
          Preencha o endereço completo para liberar o pagamento da entrega.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
      <div
        className="border-b border-black/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: primaryColor }}
      >
        {payHint}
      </div>
      {loadError ? (
        <p className="mx-3 my-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : !brickReady ? (
        <p className="px-3 py-3 text-sm text-neutral-500">
          Carregando Pix e cartão…
        </p>
      ) : null}
      {initialized ? (
      <div className="px-1 py-2">
        <Payment
          key={`${publicKey}-${amountCents}-${fulfillmentMethod}-${selectedAddonIds.join(',')}-${shippingAddressKey(shippingAddress)}`}
          initialization={{ amount }}
          customization={{
            paymentMethods: {
              creditCard: 'all',
              bankTransfer: 'all',
              maxInstallments: 12,
            },
            visual: {
              style: {
                theme: 'default',
              },
            },
          }}
          onReady={() => {
            setBrickReady(true);
            setLoadError(null);
          }}
          onSubmit={async ({ formData }) => {
            try {
              if (
                fulfillmentMethod === 'delivery' &&
                !isShippingAddressComplete(shippingAddress)
              ) {
                throw new Error(
                  'Preencha o endereço completo para continuar com a entrega.',
                );
              }

              const payerEmail =
                formData.payer?.email?.trim() ||
                (formData as { email?: string }).email?.trim() ||
                '';
              if (!payerEmail) {
                throw new Error('Informe o e-mail no formulário de pagamento.');
              }

              const identification = formData.payer?.identification;
              const result = await createTransparentOfferPayment(
                storeSlug,
                coupon,
                {
                  selectedAddonIds,
                  fulfillmentMethod,
                  ...(fulfillmentMethod === 'delivery' && shippingAddress
                    ? {
                        shippingAddress: {
                          recipientName: shippingAddress.recipientName.trim(),
                          phoneE164: shippingAddress.phoneE164.trim(),
                          cep: shippingAddress.cep.replace(/\D/g, ''),
                          street: shippingAddress.street.trim(),
                          number: shippingAddress.number.trim(),
                          ...(shippingAddress.complement?.trim()
                            ? {
                                complement:
                                  shippingAddress.complement.trim(),
                              }
                            : {}),
                          neighborhood: shippingAddress.neighborhood.trim(),
                          city: shippingAddress.city.trim(),
                          state: shippingAddress.state.trim().toUpperCase(),
                        },
                      }
                    : {}),
                  paymentMethodId: formData.payment_method_id,
                  token: formData.token,
                  installments: formData.installments,
                  issuerId:
                    formData.issuer_id != null
                      ? String(formData.issuer_id)
                      : undefined,
                  payerEmail,
                  payerIdentification:
                    identification?.type && identification?.number
                      ? {
                          type: identification.type,
                          number: String(identification.number),
                        }
                      : undefined,
                },
              );

              if (result.status === 'approved') {
                onApproved();
                return;
              }

              if (
                result.status === 'pending' ||
                result.status === 'in_process'
              ) {
                onPending(result);
                return;
              }

              throw new Error(
                result.statusDetail ||
                  `Pagamento não aprovado (${result.status}).`,
              );
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Não foi possível processar o pagamento.';
              onError(message);
              throw err;
            }
          }}
          onError={() => {
            if (!brickReady) {
              setLoadError(MP_BRICK_LOAD_ERROR);
              return;
            }
            onError('Erro no formulário de pagamento. Tente novamente.');
          }}
        />
      </div>
      ) : null}
    </div>
  );
}
