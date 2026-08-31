/** Brazilian mobile as the merchant types it: (xx) 9 9999-9999. Never +55. */

export const BR_MOBILE_NATIONAL_PLACEHOLDER = '(11) 9 9999-9999';

function nationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

export function formatBrMobileNational(raw: string): string {
  const digits = nationalDigits(raw);
  if (!digits) return '';

  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) {
    return digits.length === 2 ? `(${ddd})` : `(${ddd}`;
  }

  const subscriber = digits.slice(2);
  const nine = subscriber.slice(0, 1);
  const rest = subscriber.slice(1);
  if (!rest) return `(${ddd}) ${nine}`;
  if (rest.length <= 4) return `(${ddd}) ${nine} ${rest}`;
  return `(${ddd}) ${nine} ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
}

export function nationalBrMobileToE164(raw: string): string | null {
  const digits = nationalDigits(raw);
  if (digits.length !== 11) return null;
  if (digits[2] !== '9') return null;
  return `+55${digits}`;
}

export function e164ToBrMobileNational(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return formatBrMobileNational(raw);
}

export type FulfillmentMerchantFormInput = {
  pickupAddressText: string;
  orderNotifyPhone: string;
};

export type FulfillmentMerchantFormErrors = {
  pickupAddressText?: string;
  orderNotifyPhone?: string;
};

export type FulfillmentMerchantFormResult =
  | {
      ok: true;
      pickupAddressText: string;
      orderNotifyPhoneE164: string;
    }
  | {
      ok: false;
      errors: FulfillmentMerchantFormErrors;
    };

export function validateFulfillmentMerchantForm(
  input: FulfillmentMerchantFormInput,
): FulfillmentMerchantFormResult {
  const pickupAddressText = input.pickupAddressText.trim();
  const phoneRaw = input.orderNotifyPhone.trim();
  const orderNotifyPhoneE164 = phoneRaw ? nationalBrMobileToE164(phoneRaw) : null;
  const errors: FulfillmentMerchantFormErrors = {};

  if (!pickupAddressText) {
    errors.pickupAddressText = 'Informe o endereço de retirada.';
  }

  if (!phoneRaw) {
    errors.orderNotifyPhone = 'Informe o WhatsApp para avisos de pedido.';
  } else if (!orderNotifyPhoneE164) {
    errors.orderNotifyPhone =
      'Informe um celular no formato (11) 9 9999-9999.';
  }

  if (errors.pickupAddressText || errors.orderNotifyPhone || !orderNotifyPhoneE164) {
    return { ok: false, errors };
  }

  return { ok: true, pickupAddressText, orderNotifyPhoneE164 };
}
