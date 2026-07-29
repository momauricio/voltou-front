'use client';

import { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import {
  createTransparentOfferPayment,
  type TransparentPaymentResult,
} from '@/lib/api';

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
  const [ready, setReady] = useState(false);
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
    setReady(true);
  }, [publicKey]);

  if (!ready || amount <= 0) return null;

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
      <div className="px-1 py-2">
        <Payment
          key={`${publicKey}-${amountCents}-${fulfillmentMethod}-${selectedAddonIds.join(',')}`}
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
            onError('Erro no formulário de pagamento. Tente novamente.');
          }}
        />
      </div>
    </div>
  );
}
