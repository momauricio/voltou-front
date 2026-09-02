import {
  formatDatePtBr,
  formatDateTimePtBr,
} from './lojista-panel-ux.ts';

export type ClienteStatus = 'Retornou' | 'Contatado' | 'Aguardando' | 'Inativo';

export type InterestSource = 'walk_in' | 'whatsapp' | 'import' | 'ai' | 'web';
export type InterestStatus = 'open' | 'converted' | 'discarded';

export type CustomerInterest = {
  id: string;
  productId?: string;
  productNameSnapshot: string;
  productPriceCents?: number;
  source: InterestSource;
  status: InterestStatus;
  notes?: string;
  interestedAt: string;
};

export type SaleSource = 'in_store' | 'checkout_link' | 'ai' | 'import';

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  amountCents: number;
  source: SaleSource;
  soldAt: string;
};

export type CheckoutStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export type Checkout = {
  id: string;
  token: string;
  productId?: string;
  productNameSnapshot: string;
  amountCents: number;
  status: CheckoutStatus;
  paymentUrl: string;
  commissionRateBps: number;
  commissionCents: number;
  interestId?: string;
  createdAt: string;
  paidAt?: string;
  couponCode?: string | null;
  mpPaymentId?: string | null;
};

export type EventType =
  | 'interest'
  | 'sale'
  | 'checkout_sent'
  | 'checkout_paid'
  | 'outreach'
  | 'reply'
  | 'note';

export type CustomerEvent = {
  id: string;
  type: EventType;
  title: string;
  detail?: string;
  occurredAt: string;
};

export type MockCustomer = {
  id: string;
  displayName: string;
  phoneMasked: string;
  whatsapp: string;
  phoneIsMasked?: boolean;
  status: ClienteStatus;
  produto: string;
  compra: string;
  disparo: string;
  interests: CustomerInterest[];
  sales: Sale[];
  checkouts: Checkout[];
  events: CustomerEvent[];
};

export type MockProduct = {
  id: string;
  nome: string;
  precoCents: number;
  categoria: string;
};

/** Categorias típicas de varejo físico (sapataria / moda). */
export const PRODUCT_CATEGORIES = [
  'Tênis',
  'Roupas',
  'Acessórios',
  'Meias',
  'Bolsas',
] as const;

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: '1', nome: 'Tênis Runner Pro', precoCents: 34990, categoria: 'Tênis' },
  { id: '2', nome: 'Jaqueta Windbreaker', precoCents: 25900, categoria: 'Roupas' },
  { id: '3', nome: 'Mochila Urban', precoCents: 18990, categoria: 'Bolsas' },
  { id: '4', nome: 'Boné Classic', precoCents: 7990, categoria: 'Acessórios' },
  { id: '5', nome: 'Meia Performance 3-pack', precoCents: 4990, categoria: 'Meias' },
  { id: '6', nome: 'Tênis Casual Street', precoCents: 27990, categoria: 'Tênis' },
  { id: '7', nome: 'Camiseta Dry-Fit', precoCents: 8990, categoria: 'Roupas' },
  { id: '8', nome: 'Bolsa Crossbody', precoCents: 15990, categoria: 'Bolsas' },
];

export const COMMISSION_RATE_BPS = 500; // 5%
export const STORE_NAME = 'Loja Demo Voltou';

const SOURCE_LABEL: Record<InterestSource, string> = {
  walk_in: 'Loja física',
  whatsapp: 'WhatsApp',
  import: 'Importação',
  ai: 'Recuperação',
  web: 'Site',
};

const SALE_SOURCE_LABEL: Record<SaleSource, string> = {
  in_store: 'Loja física',
  checkout_link: 'Link de pagamento',
  ai: 'Recuperação',
  import: 'Importação',
};

let customers: MockCustomer[] = buildInitialCustomers();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeCustomers(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string) {
  return formatDatePtBr(iso);
}

export function formatDateTime(iso: string) {
  return formatDateTimePtBr(iso);
}

export function maskWhatsapp(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const ddd = digits.slice(0, 2);
  const first = digits[2];
  const last4 = digits.slice(-4);
  return `(${ddd}) ${first}****-${last4}`;
}

export function interestSourceLabel(source: InterestSource) {
  return SOURCE_LABEL[source];
}

export function saleSourceLabel(source: SaleSource) {
  return SALE_SOURCE_LABEL[source];
}

function buildInitialCustomers(): MockCustomer[] {
  const mkInterest = (
    product: MockProduct,
    source: InterestSource,
    daysAgo: number,
    status: InterestStatus = 'open',
    notes?: string,
  ): CustomerInterest => ({
    id: crypto.randomUUID(),
    productId: product.id,
    productNameSnapshot: product.nome,
    productPriceCents: product.precoCents,
    source,
    status,
    notes,
    interestedAt: daysAgoIso(daysAgo),
  });

  const mkSale = (
    product: MockProduct,
    source: SaleSource,
    daysAgo: number,
  ): Sale => ({
    id: crypto.randomUUID(),
    productId: product.id,
    productName: product.nome,
    amountCents: product.precoCents,
    source,
    soldAt: daysAgoIso(daysAgo),
  });

  const mkCheckout = (
    product: MockProduct,
    status: CheckoutStatus,
    daysAgo: number,
    token: string,
  ): Checkout => {
    const amountCents = product.precoCents;
    const commissionCents = Math.round((amountCents * COMMISSION_RATE_BPS) / 10000);
    return {
      id: crypto.randomUUID(),
      token,
      productId: product.id,
      productNameSnapshot: product.nome,
      amountCents,
      status,
      paymentUrl: `http://localhost:3000/p/${token}`,
      commissionRateBps: COMMISSION_RATE_BPS,
      commissionCents,
      createdAt: daysAgoIso(daysAgo),
      paidAt: status === 'paid' ? daysAgoIso(daysAgo - 1) : undefined,
    };
  };

  const mkEvent = (
    type: EventType,
    title: string,
    daysAgo: number,
    detail?: string,
  ): CustomerEvent => ({
    id: crypto.randomUUID(),
    type,
    title,
    detail,
    occurredAt: daysAgoIso(daysAgo),
  });

  const tenis = MOCK_PRODUCTS[0];
  const jaqueta = MOCK_PRODUCTS[1];
  const mochila = MOCK_PRODUCTS[2];
  const bone = MOCK_PRODUCTS[3];

  return [
    {
      id: '1',
      displayName: 'Mariana Costa',
      whatsapp: '(11) 91234-5678',
      phoneMasked: maskWhatsapp('(11) 91234-5678'),
      status: 'Retornou',
      produto: tenis.nome,
      compra: '12/06/2026',
      disparo: 'Enviado em 15/06',
      interests: [
        mkInterest(tenis, 'walk_in', 30, 'converted'),
        mkInterest(jaqueta, 'whatsapp', 5, 'open', 'Perguntou sobre tamanho M'),
      ],
      sales: [mkSale(tenis, 'checkout_link', 18)],
      checkouts: [
        mkCheckout(tenis, 'paid', 20, 'a1b2c3d4'),
        mkCheckout(jaqueta, 'pending', 3, 'e5f6g7h8'),
      ],
      events: [
        mkEvent('interest', 'Interesse em Tênis Runner Pro', 30, 'Registrado na loja física'),
        mkEvent('checkout_sent', 'Link de pagamento enviado', 20, 'Tênis Runner Pro · R$ 349,90'),
        mkEvent('checkout_paid', 'Pagamento confirmado', 18, 'Tênis Runner Pro'),
        mkEvent('sale', 'Compra registrada', 18, 'Via link de pagamento'),
        mkEvent('outreach', 'Disparo WhatsApp enviado', 15, 'Campanha de retorno'),
        mkEvent('interest', 'Interesse em Jaqueta Windbreaker', 5, 'Via WhatsApp'),
        mkEvent('checkout_sent', 'Link de pagamento enviado', 3, 'Jaqueta Windbreaker · R$ 259,00'),
      ],
    },
    {
      id: '2',
      displayName: 'João Pedro Alves',
      whatsapp: '(11) 98877-2211',
      phoneMasked: maskWhatsapp('(11) 98877-2211'),
      status: 'Contatado',
      produto: mochila.nome,
      compra: '28/05/2026',
      disparo: 'Enviado em 02/06',
      interests: [mkInterest(mochila, 'import', 45, 'open')],
      sales: [mkSale(mochila, 'in_store', 42)],
      checkouts: [],
      events: [
        mkEvent('sale', 'Compra na loja física', 42, mochila.nome),
        mkEvent('outreach', 'Disparo WhatsApp enviado', 38, 'Mensagem de retorno'),
        mkEvent('interest', 'Interesse em Mochila Urban', 45, 'Importado via CSV'),
      ],
    },
    {
      id: '3',
      displayName: 'Fernanda Lima',
      whatsapp: '(21) 99711-4432',
      phoneMasked: maskWhatsapp('(21) 99711-4432'),
      status: 'Aguardando',
      produto: jaqueta.nome,
      compra: '20/05/2026',
      disparo: 'Agendado para 25/06',
      interests: [mkInterest(jaqueta, 'ai', 22, 'open', 'Sugerido na recuperação após compra anterior')],
      sales: [mkSale(bone, 'in_store', 50)],
      checkouts: [mkCheckout(jaqueta, 'pending', 2, 'f9k2m1n0')],
      events: [
        mkEvent('sale', 'Compra na loja física', 50, bone.nome),
        mkEvent('interest', 'Interesse em Jaqueta Windbreaker', 22, 'Sugerido na recuperação'),
        mkEvent('checkout_sent', 'Link de pagamento enviado', 2, 'Jaqueta Windbreaker · R$ 259,00'),
      ],
    },
    {
      id: '4',
      displayName: 'Ricardo Santos',
      whatsapp: '(31) 98444-0091',
      phoneMasked: maskWhatsapp('(31) 98444-0091'),
      status: 'Inativo',
      produto: bone.nome,
      compra: '10/04/2026',
      disparo: 'Não enviado',
      interests: [mkInterest(bone, 'walk_in', 60, 'discarded')],
      sales: [mkSale(bone, 'in_store', 62)],
      checkouts: [],
      events: [
        mkEvent('sale', 'Compra na loja física', 62, bone.nome),
        mkEvent('interest', 'Interesse em Boné Classic', 60, 'Não converteu'),
      ],
    },
  ];
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function sortEvents(events: CustomerEvent[]) {
  return [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

function findCustomer(id: string) {
  return customers.find((c) => c.id === id);
}

function findProductByName(name: string) {
  return MOCK_PRODUCTS.find((p) => p.nome === name);
}

export function listCustomers(): MockCustomer[] {
  return customers;
}

export function getCustomer(id: string): MockCustomer | undefined {
  return findCustomer(id);
}

export function getCheckoutByToken(token: string): (Checkout & { customerName: string; storeName: string }) | undefined {
  for (const customer of customers) {
    const checkout = customer.checkouts.find((c) => c.token === token);
    if (checkout) {
      return { ...checkout, customerName: customer.displayName, storeName: STORE_NAME };
    }
  }
  return undefined;
}

export function createCustomer(payload: {
  nome: string;
  whatsapp: string;
  produtoInteresse: string;
}): MockCustomer {
  const product = findProductByName(payload.produtoInteresse) ?? MOCK_PRODUCTS[0];
  const interest = {
    id: crypto.randomUUID(),
    productId: product.id,
    productNameSnapshot: product.nome,
    productPriceCents: product.precoCents,
    source: 'walk_in' as InterestSource,
    status: 'open' as InterestStatus,
    interestedAt: new Date().toISOString(),
  };

  const customer: MockCustomer = {
    id: crypto.randomUUID(),
    displayName: payload.nome.trim(),
    whatsapp: payload.whatsapp.trim(),
    phoneMasked: maskWhatsapp(payload.whatsapp.trim()),
    status: 'Aguardando',
    produto: product.nome,
    compra: '—',
    disparo: 'Não enviado',
    interests: [interest],
    sales: [],
    checkouts: [],
    events: [
      {
        id: crypto.randomUUID(),
        type: 'interest',
        title: `Interesse em ${product.nome}`,
        detail: 'Cadastro manual',
        occurredAt: new Date().toISOString(),
      },
    ],
  };

  customers = [customer, ...customers];
  notify();
  return customer;
}

function phoneDigitsOf(customer: MockCustomer): string {
  const fromWhatsapp = customer.whatsapp.replace(/\D/g, '');
  if (fromWhatsapp.length >= 10) {
    return fromWhatsapp.startsWith('55') && fromWhatsapp.length >= 12
      ? fromWhatsapp.slice(2)
      : fromWhatsapp;
  }
  return customer.phoneMasked.replace(/\D/g, '');
}

/** Upsert by phone digits — used by CSV import. */
export function upsertCustomerFromImport(payload: {
  nome: string;
  telefone: string;
  telefoneDigits: string;
  produto: string;
  dataCompra: string | null;
}): { created: boolean; customer: MockCustomer } {
  const existing = customers.find((c) => phoneDigitsOf(c) === payload.telefoneDigits);
  const product =
    (payload.produto && payload.produto !== '—'
      ? findProductByName(payload.produto)
      : undefined) ??
    (payload.produto && payload.produto !== '—'
      ? {
          id: `import-${payload.produto}`,
          nome: payload.produto,
          precoCents: 0,
          categoria: 'Geral',
        }
      : MOCK_PRODUCTS[0]);

  if (existing) {
    existing.displayName = payload.nome.trim();
    existing.whatsapp = payload.telefone;
    existing.phoneMasked = maskWhatsapp(payload.telefone);
    existing.produto = product.nome;

    if (payload.dataCompra) {
      const sale: Sale = {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.nome,
        amountCents: product.precoCents || 0,
        source: 'import',
        soldAt: payload.dataCompra,
      };
      existing.sales.unshift(sale);
      existing.compra = formatDate(payload.dataCompra);
      existing.status = 'Retornou';
      existing.events = sortEvents([
        {
          id: crypto.randomUUID(),
          type: 'sale',
          title: 'Compra importada',
          detail: `${product.nome} · ${formatDate(payload.dataCompra)}`,
          occurredAt: payload.dataCompra,
        },
        ...existing.events,
      ]);
    } else {
      const interest: CustomerInterest = {
        id: crypto.randomUUID(),
        productId: product.id,
        productNameSnapshot: product.nome,
        productPriceCents: product.precoCents || undefined,
        source: 'import',
        status: 'open',
        interestedAt: new Date().toISOString(),
      };
      existing.interests.unshift(interest);
      existing.events = sortEvents([
        {
          id: crypto.randomUUID(),
          type: 'interest',
          title: `Interesse em ${product.nome}`,
          detail: 'Atualizado via CSV',
          occurredAt: interest.interestedAt,
        },
        ...existing.events,
      ]);
    }

    notify();
    return { created: false, customer: existing };
  }

  const interestedAt = payload.dataCompra ?? new Date().toISOString();
  const interest: CustomerInterest = {
    id: crypto.randomUUID(),
    productId: product.id,
    productNameSnapshot: product.nome,
    productPriceCents: product.precoCents || undefined,
    source: 'import',
    status: payload.dataCompra ? 'converted' : 'open',
    interestedAt,
  };

  const sales: Sale[] = [];
  const events: CustomerEvent[] = [
    {
      id: crypto.randomUUID(),
      type: 'interest',
      title: `Interesse em ${product.nome}`,
      detail: 'Importação CSV',
      occurredAt: interestedAt,
    },
  ];

  let compra = '—';
  let status: ClienteStatus = 'Aguardando';

  if (payload.dataCompra) {
    const sale: Sale = {
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.nome,
      amountCents: product.precoCents || 0,
      source: 'import',
      soldAt: payload.dataCompra,
    };
    sales.push(sale);
    compra = formatDate(payload.dataCompra);
    status = 'Retornou';
    events.unshift({
      id: crypto.randomUUID(),
      type: 'sale',
      title: 'Compra importada',
      detail: `${product.nome} · ${compra}`,
      occurredAt: payload.dataCompra,
    });
  }

  const customer: MockCustomer = {
    id: crypto.randomUUID(),
    displayName: payload.nome.trim(),
    whatsapp: payload.telefone,
    phoneMasked: maskWhatsapp(payload.telefone),
    status,
    produto: product.nome,
    compra,
    disparo: 'Não enviado',
    interests: [interest],
    sales,
    checkouts: [],
    events: sortEvents(events),
  };

  customers = [customer, ...customers];
  notify();
  return { created: true, customer };
}

export function removeCustomer(id: string) {
  customers = customers.filter((c) => c.id !== id);
  notify();
}

export function addInterest(
  customerId: string,
  payload: { productName: string; notes?: string; source?: InterestSource },
): CustomerInterest | undefined {
  const customer = findCustomer(customerId);
  if (!customer) return undefined;

  const product = findProductByName(payload.productName) ?? MOCK_PRODUCTS[0];
  const interest: CustomerInterest = {
    id: crypto.randomUUID(),
    productId: product.id,
    productNameSnapshot: product.nome,
    productPriceCents: product.precoCents,
    source: payload.source ?? 'walk_in',
    status: 'open',
    notes: payload.notes,
    interestedAt: new Date().toISOString(),
  };

  customer.interests.unshift(interest);
  customer.produto = product.nome;
  customer.events = sortEvents([
    {
      id: crypto.randomUUID(),
      type: 'interest',
      title: `Interesse em ${product.nome}`,
      detail: payload.notes || interestSourceLabel(interest.source),
      occurredAt: interest.interestedAt,
    },
    ...customer.events,
  ]);

  notify();
  return interest;
}

export function addSale(
  customerId: string,
  payload: { productName: string; amountCents?: number },
): Sale | undefined {
  const customer = findCustomer(customerId);
  if (!customer) return undefined;

  const product = findProductByName(payload.productName) ?? MOCK_PRODUCTS[0];
  const amountCents = payload.amountCents ?? product.precoCents;

  const sale: Sale = {
    id: crypto.randomUUID(),
    productId: product.id,
    productName: product.nome,
    amountCents,
    source: 'in_store',
    soldAt: new Date().toISOString(),
  };

  customer.sales.unshift(sale);
  customer.compra = formatDate(sale.soldAt);
  customer.status = 'Retornou';
  customer.events = sortEvents([
    {
      id: crypto.randomUUID(),
      type: 'sale',
      title: 'Compra na loja física',
      detail: `${product.nome} · ${formatCurrency(amountCents)}`,
      occurredAt: sale.soldAt,
    },
    ...customer.events,
  ]);

  notify();
  return sale;
}

export function createCheckout(
  customerId: string,
  payload: {
    productName: string;
    amountCents?: number;
    interestId?: string;
  },
): Checkout | undefined {
  const customer = findCustomer(customerId);
  if (!customer) return undefined;

  const product = findProductByName(payload.productName) ?? MOCK_PRODUCTS[0];
  const amountCents = payload.amountCents ?? product.precoCents;
  const commissionCents = Math.round((amountCents * COMMISSION_RATE_BPS) / 10000);
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 8);

  const checkout: Checkout = {
    id: crypto.randomUUID(),
    token,
    productId: product.id,
    productNameSnapshot: product.nome,
    amountCents,
    status: 'pending',
    paymentUrl: `http://localhost:3000/p/${token}`,
    commissionRateBps: COMMISSION_RATE_BPS,
    commissionCents,
    interestId: payload.interestId,
    createdAt: new Date().toISOString(),
  };

  customer.checkouts.unshift(checkout);
  customer.events = sortEvents([
    {
      id: crypto.randomUUID(),
      type: 'checkout_sent',
      title: 'Link de pagamento enviado',
      detail: `${product.nome} · ${formatCurrency(amountCents)}`,
      occurredAt: checkout.createdAt,
    },
    ...customer.events,
  ]);

  notify();
  return checkout;
}

export function markCheckoutPaid(checkoutId: string): Checkout | undefined {
  for (const customer of customers) {
    const checkout = customer.checkouts.find((c) => c.id === checkoutId);
    if (!checkout || checkout.status === 'paid') return checkout;

    checkout.status = 'paid';
    checkout.paidAt = new Date().toISOString();

    const sale: Sale = {
      id: crypto.randomUUID(),
      productId: checkout.productId ?? MOCK_PRODUCTS[0].id,
      productName: checkout.productNameSnapshot,
      amountCents: checkout.amountCents,
      source: 'checkout_link',
      soldAt: checkout.paidAt,
    };

    customer.sales.unshift(sale);
    customer.compra = formatDate(sale.soldAt);
    customer.status = 'Retornou';

    if (checkout.interestId) {
      const interest = customer.interests.find((i) => i.id === checkout.interestId);
      if (interest) interest.status = 'converted';
    }

    customer.events = sortEvents([
      {
        id: crypto.randomUUID(),
        type: 'checkout_paid',
        title: 'Pagamento confirmado',
        detail: `${checkout.productNameSnapshot} · ${formatCurrency(checkout.amountCents)}`,
        occurredAt: checkout.paidAt,
      },
      {
        id: crypto.randomUUID(),
        type: 'sale',
        title: 'Compra via link de pagamento',
        detail: checkout.productNameSnapshot,
        occurredAt: checkout.paidAt,
      },
      ...customer.events,
    ]);

    notify();
    return checkout;
  }
  return undefined;
}
