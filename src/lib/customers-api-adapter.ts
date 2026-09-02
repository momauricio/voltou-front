import type {
  ApiCustomerDetail,
  ApiCustomerSummary,
} from '@/lib/api';
import {
  formatDate,
  type Checkout,
  type CheckoutStatus,
  type ClienteStatus,
  type CustomerEvent,
  type CustomerInterest,
  type EventType,
  type InterestSource,
  type InterestStatus,
  type MockCustomer,
  type Sale,
  type SaleSource,
} from '@/lib/mock-customers';
import {
  merchantCustomerPhone,
  uniqueCheckouts,
} from '@/lib/lojista-panel-ux';

const INACTIVE_DAYS = 60;

function deriveStatus(params: {
  lastSaleAt: string | null;
  hasPendingCheckout: boolean;
  hasOutreach: boolean;
  hasReply: boolean;
}): ClienteStatus {
  // Respondeu o disparo → Retornou (engajamento de volta)
  if (params.hasReply) return 'Retornou';

  if (params.lastSaleAt) {
    const ageDays =
      (Date.now() - new Date(params.lastSaleAt).getTime()) /
      (24 * 60 * 60 * 1000);
    if (ageDays <= INACTIVE_DAYS) return 'Retornou';
    if (params.hasOutreach || params.hasPendingCheckout) return 'Contatado';
    return 'Inativo';
  }
  if (params.hasOutreach || params.hasPendingCheckout) return 'Contatado';
  return 'Aguardando';
}

function toInterestSource(source: string): InterestSource {
  const known: InterestSource[] = ['walk_in', 'whatsapp', 'import', 'ai', 'web'];
  return known.includes(source as InterestSource)
    ? (source as InterestSource)
    : 'walk_in';
}

function toSaleSource(source: string): SaleSource {
  const known: SaleSource[] = ['in_store', 'checkout_link', 'ai', 'import'];
  return known.includes(source as SaleSource)
    ? (source as SaleSource)
    : 'in_store';
}

function toEventType(type: string): EventType {
  const known: EventType[] = [
    'interest',
    'sale',
    'checkout_sent',
    'checkout_paid',
    'outreach',
    'reply',
    'note',
  ];
  return known.includes(type as EventType) ? (type as EventType) : 'note';
}

export function mapApiCustomerSummary(api: ApiCustomerSummary): MockCustomer {
  const lastSale = api.sales[0] ?? null;
  const openInterest = api.customerInterests[0] ?? null;
  const hasPendingCheckout = api.checkouts.some((c) => c.status === 'pending');
  const outreach = api.outreachMessages ?? [];
  const hasOutreach = outreach.length > 0;
  const hasReply = outreach.some((m) => m.repliedAt != null);
  const phone = merchantCustomerPhone({
    phoneMasked: api.phoneMasked,
    phone: api.phone,
    phoneDisplay: api.phoneDisplay,
    phoneE164: api.phoneE164,
  });

  return {
    id: api.id,
    displayName: api.displayName,
    phoneMasked: phone.display,
    whatsapp: phone.display,
    phoneIsMasked: phone.masked,
    status: deriveStatus({
      lastSaleAt: lastSale?.soldAt ?? null,
      hasPendingCheckout,
      hasOutreach,
      hasReply,
    }),
    produto:
      openInterest?.productNameSnapshot ??
      lastSale?.product?.name ??
      '—',
    compra: lastSale ? formatDate(lastSale.soldAt) : '—',
    disparo: hasReply
      ? 'Respondeu'
      : hasOutreach
        ? 'Enviado'
        : hasPendingCheckout
          ? 'Link pendente'
          : '—',
    interests: [],
    sales: [],
    checkouts: [],
    events: [],
  };
}

export type CustomerDetailView = MockCustomer & {
  optedOut: boolean;
  phoneIsMasked: boolean;
};

export function mapApiCustomerDetail(api: ApiCustomerDetail): CustomerDetailView {
  const interests: CustomerInterest[] = api.customerInterests.map((i) => ({
    id: i.id,
    productId: i.productId ?? undefined,
    productNameSnapshot: i.productNameSnapshot,
    productPriceCents: i.productPriceCents ?? undefined,
    source: toInterestSource(i.source),
    status: (i.status as InterestStatus) ?? 'open',
    notes: i.notes ?? undefined,
    interestedAt: i.interestedAt,
  }));

  const sales: Sale[] = api.sales.map((s) => ({
    id: s.id,
    productId: s.productId,
    productName: s.product?.name ?? '—',
    amountCents: s.amountCents,
    source: toSaleSource(s.source),
    soldAt: s.soldAt,
  }));

  const checkouts: Checkout[] = uniqueCheckouts(api.checkouts).map((c) => ({
    id: c.id,
    token: '',
    productNameSnapshot: c.productNameSnapshot,
    amountCents: c.amountCents,
    status: (c.status as CheckoutStatus) ?? 'pending',
    paymentUrl: c.paymentUrl,
    commissionRateBps: c.commissionRateBps,
    commissionCents: c.commissionCents,
    interestId: c.interestId ?? undefined,
    createdAt: c.createdAt,
    paidAt: c.paidAt ?? undefined,
    couponCode: c.couponCode ?? undefined,
    mpPaymentId: c.mpPaymentId ?? undefined,
  }));

  // Respostas: sem texto; dedupe visual (um registro de "respondeu" basta)
  const seenReply = new Set<string>();
  const events: CustomerEvent[] = [];
  for (const e of api.customerEvents) {
    const type = toEventType(e.type);
    if (type === 'reply') {
      const day = e.occurredAt.slice(0, 10);
      if (seenReply.has(day)) continue;
      seenReply.add(day);
      events.push({
        id: e.id,
        type,
        title: 'Cliente respondeu no WhatsApp',
        detail: undefined,
        occurredAt: e.occurredAt,
      });
      continue;
    }
    events.push({
      id: e.id,
      type,
      title: e.title,
      detail: e.detail ?? undefined,
      occurredAt: e.occurredAt,
    });
  }

  const lastSale = sales[0] ?? null;
  const openInterest = interests.find((i) => i.status === 'open') ?? null;
  const hasPendingCheckout = checkouts.some((c) => c.status === 'pending');
  const hasOutreach = events.some((e) => e.type === 'outreach');
  const hasReply = events.some((e) => e.type === 'reply');
  const phone = merchantCustomerPhone({
    phoneMasked: api.phoneMasked,
    phone: api.phone,
    phoneDisplay: api.phoneDisplay,
    phoneE164: api.phoneE164,
    whatsapp: api.whatsapp,
  });

  return {
    id: api.id,
    displayName: api.displayName,
    phoneMasked: phone.display,
    whatsapp: phone.display,
    phoneIsMasked: phone.masked,
    status: deriveStatus({
      lastSaleAt: lastSale?.soldAt ?? null,
      hasPendingCheckout,
      hasOutreach,
      hasReply,
    }),
    produto: openInterest?.productNameSnapshot ?? lastSale?.productName ?? '—',
    compra: lastSale ? formatDate(lastSale.soldAt) : '—',
    disparo: hasReply ? 'Respondeu' : hasOutreach ? 'Enviado' : '—',
    interests,
    sales,
    checkouts,
    events,
    optedOut: api.optedOutAt != null,
  };
}
