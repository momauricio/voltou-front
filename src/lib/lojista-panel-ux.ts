/**
 * Lojista panel honesty: never mix demo/fake metrics into a logged-in session.
 * Recovery campaign queues stay with Voltou staff, not the merchant UI.
 */

import { formatBrMobileNational } from './br-mobile-national.ts';

const SAO_PAULO = 'America/Sao_Paulo';
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR_FULL_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const BR_DAY_MONTH = /^(\d{1,2})\/(\d{1,2})$/;
const MASKY_PHONE = /\*|•/;

export function lojistaDemoBannerVisible(input: {
  accessToken: string | null | undefined;
}): boolean {
  void input.accessToken;
  // /painel is session-gated. Demo copy must never appear — including the first
  // paint before tenant context resolves, and when the API errors.
  return false;
}

export function lojistaApiLoadError(cause?: string): string {
  const suffix = cause?.trim() ? ` (${cause.trim()})` : '';
  return `Não foi possível carregar os dados${suffix}. Tente de novo.`;
}

export type MerchantFunnelInput = {
  contacted: number;
  interested: number;
  checkoutsSent: number;
  checkoutsPaid: number;
};

export type MerchantFunnelStep = {
  label: string;
  value: number;
  emphasis?: boolean;
};

/** Contatados is a staff-operated recovery metric — hide it on the lojista funnel. */
export function merchantVisibleFunnelSteps(
  funnel: MerchantFunnelInput,
): MerchantFunnelStep[] {
  return [
    { label: 'Interessados', value: funnel.interested },
    { label: 'Checkouts', value: funnel.checkoutsSent },
    { label: 'Pagos', value: funnel.checkoutsPaid, emphasis: true },
  ];
}

function pad2(value: string | number): string {
  return String(value).padStart(2, '0');
}

type BrDateParts = {
  day: string;
  month: string;
  year: string;
  hour?: string;
  minute?: string;
};

function saoPauloParts(date: Date, withTime: boolean): BrDateParts | null {
  if (Number.isNaN(date.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : {}),
  });
  const mapped: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') mapped[part.type] = part.value;
  }
  if (!mapped.day || !mapped.month || !mapped.year) return null;
  return {
    day: pad2(mapped.day),
    month: pad2(mapped.month),
    year: mapped.year,
    hour: mapped.hour === '24' ? '00' : mapped.hour,
    minute: mapped.minute,
  };
}

function brDateParts(
  value: string | number | Date | null | undefined,
  withTime: boolean,
): BrDateParts | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const br = BR_FULL_DATE.exec(trimmed);
    if (br) return { day: br[1], month: br[2], year: br[3] };
    const iso = ISO_DATE_ONLY.exec(trimmed);
    if (iso) return { day: iso[3], month: iso[2], year: iso[1] };
    const date = new Date(trimmed);
    return saoPauloParts(date, withTime);
  }
  if (value instanceof Date) return saoPauloParts(value, withTime);
  if (typeof value === 'number') return saoPauloParts(new Date(value), withTime);
  return null;
}

/** Merchant-facing calendar date. Never ISO, never US mm/dd. */
export function formatDatePtBr(
  value: string | number | Date | null | undefined,
): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dm = BR_DAY_MONTH.exec(trimmed);
    if (dm && !BR_FULL_DATE.test(trimmed)) {
      return `${pad2(dm[1])}/${pad2(dm[2])}`;
    }
  }
  const parts = brDateParts(value, false);
  if (!parts) return '—';
  return `${parts.day}/${parts.month}/${parts.year}`;
}

/** Merchant-facing timestamp in America/Sao_Paulo. */
export function formatDateTimePtBr(
  value: string | number | Date | null | undefined,
): string {
  if (typeof value === 'string' && ISO_DATE_ONLY.test(value.trim())) {
    return formatDatePtBr(value);
  }
  const parts = brDateParts(value, true);
  if (!parts) return '—';
  if (!parts.hour || !parts.minute) {
    return `${parts.day}/${parts.month}/${parts.year}`;
  }
  return `${parts.day}/${parts.month}/${parts.year}, ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** Coupon validade / free-text dates: format when they are dates, keep copy otherwise. */
export function formatMerchantVisibleDate(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '—';
  if (/^sem validade$/i.test(trimmed)) return trimmed;
  const formatted = formatDatePtBr(trimmed);
  return formatted === '—' ? trimmed : formatted;
}

export function uniqueCheckouts<
  T extends {
    id?: string | null;
    couponCode?: string | null;
    createdAt?: string | null;
  },
>(checkouts: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of checkouts) {
    const id = item.id?.trim();
    const key = id
      ? `id:${id}`
      : `cc:${item.couponCode?.trim() ?? ''}|${item.createdAt?.trim() ?? ''}`;
    if (key === 'cc:|') {
      out.push(item);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export type MerchantOrderIdentity = {
  id: string;
  couponCode?: string | null;
  mpPaymentId?: string | null;
  orderNumber?: string | number | null;
  voltouOrderNumber?: string | number | null;
};

export function shortCheckoutId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function sequentialVoltouNumber(input: MerchantOrderIdentity): string | null {
  for (const raw of [input.orderNumber, input.voltouOrderNumber]) {
    if (raw == null) continue;
    const text = String(raw).trim();
    if (text) return text;
  }
  return null;
}

/** Merchant-facing Voltou order label. Never a Mercado Pago receipt id. */
export function merchantVoltouOrderLabel(input: MerchantOrderIdentity): string {
  const sequential = sequentialVoltouNumber(input);
  if (sequential) return sequential;
  const coupon = input.couponCode?.trim();
  if (coupon) return coupon;
  return shortCheckoutId(input.id);
}

export type MerchantOrderRef = {
  label: string;
  value: string;
};

export type MerchantOrderRefs = {
  voltou: MerchantOrderRef;
  coupon: MerchantOrderRef | null;
  mercadoPago: MerchantOrderRef | null;
};

export function merchantOrderRefs(input: MerchantOrderIdentity): MerchantOrderRefs {
  const voltouValue = merchantVoltouOrderLabel(input);
  const coupon = input.couponCode?.trim() || null;
  const mp = input.mpPaymentId?.trim() || null;
  return {
    voltou: { label: 'Voltou', value: voltouValue },
    coupon:
      coupon && coupon !== voltouValue
        ? { label: 'Cupom', value: coupon }
        : null,
    mercadoPago: mp ? { label: 'Mercado Pago', value: mp } : null,
  };
}

export type MerchantPhoneView = {
  display: string;
  masked: boolean;
};

function looksMasked(value: string): boolean {
  return MASKY_PHONE.test(value) || value === '****';
}

function formatOwnerPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const looksE164 =
    raw.includes('+') ||
    (digits.startsWith('55') && digits.length >= 12 && !raw.includes('('));
  if (looksE164) {
    const national = formatBrMobileNational(raw);
    return national || raw;
  }
  return raw;
}

export const CHECKOUT_STATUS_LABEL_PT_BR: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

export function checkoutStatusLabelPtBr(status: string): string {
  return CHECKOUT_STATUS_LABEL_PT_BR[status] ?? status;
}

/** Copy-link control on the customer ficha: date + status distinguish two links. */
export function copyCheckoutLinkLabel(input: {
  createdAt: string | number | Date | null | undefined;
  status: string;
}): string {
  return `Copiar link · ${formatDatePtBr(input.createdAt)} · ${checkoutStatusLabelPtBr(input.status)}`;
}

export type PickupFulfillmentItem = {
  fulfillmentMethod?: string | null;
};

export function pickupAddressIsBlank(
  pickupAddressText: string | null | undefined,
): boolean {
  return !pickupAddressText?.trim();
}

/**
 * Persistent nag leftover after Regras save-time validation:
 * empty store pickup address AND at least one Retirada order/checkout.
 */
export function shouldNudgeEmptyPickupAddress(input: {
  pickupAddressText: string | null | undefined;
  items: readonly PickupFulfillmentItem[];
}): boolean {
  if (!pickupAddressIsBlank(input.pickupAddressText)) return false;
  return input.items.some((item) => item.fulfillmentMethod === 'pickup');
}

/** Block Pronto/Concluir on a Retirada pedido while the store address is empty. */
export function shouldBlockPickupCompletion(input: {
  pickupAddressText: string | null | undefined;
  fulfillmentMethod?: string | null;
}): boolean {
  return (
    pickupAddressIsBlank(input.pickupAddressText) &&
    input.fulfillmentMethod === 'pickup'
  );
}

export const PICKUP_ADDRESS_NUDGE_MESSAGE =
  'Há pedido de Retirada sem o endereço da loja. Cadastre o endereço para o cliente saber onde retirar.';

export const PICKUP_ADDRESS_NUDGE_CTA = 'Cadastrar endereço';

export const PICKUP_ADDRESS_NUDGE_HREF = '/painel/regras#fulfillmentPickup';

export const PICKUP_ADDRESS_CHANGED_EVENT = 'voltou:pickup-address-changed';

export function notifyPickupAddressChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PICKUP_ADDRESS_CHANGED_EVENT));
}

/**
 * WhatsApp the lojista already has on the owner customer payload.
 * Never reads phoneEnc (no client-side reveal).
 */
export function merchantCustomerPhone(input: {
  phone?: string | null;
  phoneDisplay?: string | null;
  phoneE164?: string | null;
  whatsapp?: string | null;
  phoneMasked?: string | null;
  phoneEnc?: string | null;
}): MerchantPhoneView {
  void input.phoneEnc;
  const unmasked = [
    input.phoneDisplay,
    input.phone,
    input.phoneE164,
    input.whatsapp,
  ];
  for (const raw of unmasked) {
    const trimmed = raw?.trim();
    if (!trimmed || trimmed === '—' || looksMasked(trimmed)) continue;
    return { display: formatOwnerPhone(trimmed), masked: false };
  }
  const masked = input.phoneMasked?.trim();
  if (masked && masked !== '—') {
    return { display: masked, masked: looksMasked(masked) };
  }
  return { display: '—', masked: false };
}
