import { assertLojistaCannotDispatch } from '@/lib/lojista-panel-policy';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || data.error || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('voltou_token');
}

export function getStoredTenantContext() {
  if (typeof window === 'undefined') {
    return { tenantId: null as string | null, storeId: null as string | null };
  }
  return {
    tenantId: window.localStorage.getItem('voltou_tenant_id'),
    storeId: window.localStorage.getItem('voltou_store_id'),
  };
}

export function clearClientSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('voltou_token');
  window.localStorage.removeItem('voltou_tenant_id');
  window.localStorage.removeItem('voltou_store_id');
  void fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined);
}

export async function persistClientSession(result: {
  accessToken: string;
  user: { tenantId: string; storeId: string | null };
}) {
  window.localStorage.setItem('voltou_token', result.accessToken);
  window.localStorage.setItem('voltou_tenant_id', result.user.tenantId);
  if (result.user.storeId) {
    window.localStorage.setItem('voltou_store_id', result.user.storeId);
  } else {
    window.localStorage.removeItem('voltou_store_id');
  }
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: result.accessToken }),
  });
}

type JsonFetchInit = RequestInit & { auth?: boolean };

async function jsonFetch<T>(
  apiPath: string,
  init: JsonFetchInit = {},
): Promise<T> {
  const auth = init.auth !== false;
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = getStoredAccessToken();
    if (!token) {
      clearClientSession();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }
  const { auth: _ignoredAuth, ...rest } = init;
  void _ignoredAuth;
  const res = await fetch(`${API_URL}${apiPath}`, { ...rest, headers });
  if (res.status === 401 && auth) {
    clearClientSession();
  }
  return parseJson<T>(res);
}

export type RegisterPayload = {
  ownerName: string;
  storeName: string;
  cnpj: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  message: string;
  email: string;
  requiresEmailVerification: true;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    ownerName: string;
    storeName: string;
    tenantId: string;
    storeId: string | null;
  };
};

export async function registerAccount(payload: RegisterPayload) {
  return jsonFetch<RegisterResponse>(`/auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
}

export async function loginAccount(payload: LoginPayload) {
  return jsonFetch<LoginResponse>(`/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
}

export async function requestPasswordReset(email: string) {
  return jsonFetch<{ message: string; devResetUrl?: string }>(
    `/auth/forgot-password`,
    {
      method: 'POST',
      body: JSON.stringify({ email }),
      auth: false,
    },
  );
}

export async function resetPassword(token: string, newPassword: string) {
  return jsonFetch<{ message: string }>(`/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
    auth: false,
  });
}

export async function verifyEmail(token: string) {
  return jsonFetch<{ message: string }>(`/auth/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ token }),
    auth: false,
  });
}

export async function changePassword(
  accessToken: string,
  payload: { currentPassword: string; newPassword: string },
) {
  return jsonFetch<{ message: string }>(`/auth/change-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    auth: false,
  });
}

export type WhatsappConnection = {
  id: string;
  label: string;
  sessionName: string;
  status: string;
  uiStatus: 'Conectado' | 'Aguardando' | 'Desconectado';
  phoneE164: string | null;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WhatsappQr = {
  mimetype: string;
  data: string;
};

function tenantQuery(tenantId: string, storeId?: string | null) {
  const params = new URLSearchParams({ tenantId });
  if (storeId) params.set('storeId', storeId);
  return params.toString();
}

export async function listWhatsappConnections(
  tenantId: string,
  storeId?: string | null,
) {
  return jsonFetch<WhatsappConnection[]>(
    `/whatsapp/connections?${tenantQuery(tenantId, storeId)}`,
    { cache: 'no-store' },
  );
}

export async function createWhatsappSession(payload: {
  tenantId: string;
  storeId: string;
  label: string;
}) {
  return jsonFetch<WhatsappConnection>('/whatsapp/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getWhatsappSession(tenantId: string, sessionName: string) {
  return jsonFetch<WhatsappConnection & { me?: unknown }>(`/whatsapp/sessions/${encodeURIComponent(sessionName)}?tenantId=${encodeURIComponent(tenantId)}`, { cache: 'no-store' },
  );
}

export async function getWhatsappQr(tenantId: string, sessionName: string) {
  return jsonFetch<WhatsappQr>(
    `/whatsapp/sessions/${encodeURIComponent(sessionName)}/qr?tenantId=${encodeURIComponent(tenantId)}`,
    { cache: 'no-store' },
  );
}

export async function disconnectWhatsappSession(
  tenantId: string,
  sessionName: string,
) {
  return jsonFetch<{ id: string; status: string }>(
    `/whatsapp/sessions/${encodeURIComponent(sessionName)}/disconnect`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function deleteWhatsappConnection(
  tenantId: string,
  connectionId: string,
) {
  return jsonFetch<{ ok: boolean }>(
    `/whatsapp/connections/${encodeURIComponent(connectionId)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'DELETE' },
  );
}

// ---- Importação automática (planilhas, XML de NF-e) ----

export type ImportPreviewCustomer = {
  name: string;
  phone?: string;
  cpf?: string;
};

export type ImportPreviewProduct = {
  name: string;
  sku?: string;
  category?: string;
  priceCents?: number;
  costCents?: number;
  stock?: number;
};

export type ImportPreviewSale = {
  customerName?: string;
  customerPhone?: string;
  customerCpf?: string;
  productName: string;
  productSku?: string;
  quantity: number;
  amountCents: number;
  soldAt?: string;
};

export type ImportSheetKind = 'customers' | 'products' | 'sales' | 'ambiguous';

export type ImportColumnMapping = {
  field: string;
  index: number;
  header: string;
  confidence: number;
};

export type ImportSheetMeta = {
  name: string;
  kind: ImportSheetKind;
  confidence: number;
  reasons: string[];
  columnMap: Partial<Record<string, ImportColumnMapping>>;
  unmappedHeaders: string[];
  sampleRows: string[][];
  headerRowIndex: number;
  headers: string[];
};

export type ImportPreviewResult = {
  jobId: string;
  preview: {
    sourceType: string;
    customers: ImportPreviewCustomer[];
    products: ImportPreviewProduct[];
    sales: ImportPreviewSale[];
    warnings: string[];
  };
  sheets: ImportSheetMeta[];
  needsUserChoice?: {
    sheet: string;
    options: ImportSheetKind[];
  };
};

export type ImportCommitSummary = {
  jobId: string;
  customersCreated: number;
  customersUpdated: number;
  productsCreated: number;
  productsUpdated: number;
  salesCreated: number;
  salesSkipped?: number;
  warnings: string[];
};

export async function previewImport(payload: {
  tenantId: string;
  storeId: string;
  files: { name: string; content: string; encoding?: 'utf8' | 'base64' }[];
}) {
  return jsonFetch<ImportPreviewResult>('/imports/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function remapImport(payload: {
  tenantId: string;
  jobId: string;
  sheetName: string;
  kind: ImportSheetKind;
  columnMap?: Record<string, number>;
}) {
  const { jobId, ...body } = payload;
  return jsonFetch<ImportPreviewResult>(
    `/imports/${encodeURIComponent(jobId)}/remap`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function commitImport(tenantId: string, jobId: string) {
  return jsonFetch<ImportCommitSummary>(`/imports/${encodeURIComponent(jobId)}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    },
  );
}

// ---- Bling (produtos + estoque) ----

export type BlingConnection = {
  connected: boolean;
  status: string | null;
  accountLabel: string | null;
  lastSyncAt: string | null;
  configured: boolean;
};

export type BlingSyncSummary = {
  created: number;
  updated: number;
  stockUpdated: number;
  skipped: number;
  warnings: string[];
};

function tenantStoreQuery(tenantId: string, storeId: string) {
  return `tenantId=${encodeURIComponent(tenantId)}&storeId=${encodeURIComponent(storeId)}`;
}

export async function getBlingAuthorizeUrl(tenantId: string, storeId: string) {
  return jsonFetch<{ url: string; state: string }>(
    `/bling/authorize-url?${tenantStoreQuery(tenantId, storeId)}`,
  );
}

export async function completeBlingOAuth(code: string, state: string) {
  return jsonFetch<{
    tenantId: string;
    storeId: string;
    status: string;
    accountLabel: string;
  }>('/bling/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
    auth: false,
  });
}

export async function getBlingConnection(tenantId: string, storeId: string) {
  return jsonFetch<BlingConnection>(
    `/bling/connection?${tenantStoreQuery(tenantId, storeId)}`,
  );
}

export async function disconnectBling(tenantId: string, storeId: string) {
  return jsonFetch<{ status: string }>(`/bling/connection?${tenantStoreQuery(tenantId, storeId)}`, { method: 'DELETE' },
  );
}

export async function syncBlingProducts(tenantId: string, storeId: string) {
  return jsonFetch<BlingSyncSummary>('/bling/sync', {
    method: 'POST',
    body: JSON.stringify({ tenantId, storeId }),
  });
}

// ---- Mercado Pago + Checkout ----

export type MercadoPagoConnection = {
  connected: boolean;
  status: string | null;
  accountLabel: string | null;
  mpUserId: string | null;
  configured: boolean;
};

export type PublicCheckout = {
  id: string;
  status: string;
  productName: string;
  amountCents: number;
  listPriceCents?: number | null;
  discountBps?: number;
  couponCode?: string | null;
  storeSlug?: string | null;
  currency: string;
  storeName: string;
  customerName: string;
  expiresAt: string | null;
  paidAt: string | null;
  provider: string;
  initPoint: string | null;
  branding: {
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    fontFamily: string | null;
    message: string | null;
  };
};

export type PublicOfferAddon = {
  id: string;
  productName: string;
  listPriceCents: number;
  amountCents: number;
  discountBps: number;
  selectedByDefault: boolean;
};

export type PublicOfferPaidLine = {
  kind: 'principal' | 'addon';
  addonId?: string;
  productId: string;
  productNameSnapshot: string;
  listPriceCents: number;
  discountBps: number;
  amountCents: number;
};

export type PublicOffer = {
  id: string;
  status: string;
  productName: string;
  productImageUrl: string | null;
  amountCents: number;
  listPriceCents: number;
  discountBps: number;
  savingsCents: number;
  couponCode: string | null;
  currency: string;
  storeName: string;
  storeSlug: string;
  customerName: string;
  customerFirstName: string;
  expiresAt: string | null;
  paidAt: string | null;
  canPay: boolean;
  paymentMode?: 'transparent' | 'pro';
  mpPublicKey?: string | null;
  deliveryEnabled: boolean;
  shippingCents: number;
  pickupAddressText: string | null;
  addons: PublicOfferAddon[];
  discountCaps: {
    oneProductBps: number;
    twoOrMoreBps: number;
  };
  branding: {
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    fontFamily: string | null;
    message: string | null;
  };
};

export type PublicOfferStatus = {
  status: string;
  paidAt: string | null;
  amountCents: number;
  productName: string;
  storeName: string;
  storeSlug: string;
  couponCode: string | null;
  customerName: string;
  listPriceCents: number;
  discountBps: number;
  currency: string;
  paidLines?: PublicOfferPaidLine[];
  branding?: {
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    fontFamily: string | null;
    message: string | null;
  };
};

export type StoreCheckoutBranding = {
  storeId: string;
  storeName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string;
  message: string | null;
};

export type ApiCheckout = {
  id: string;
  paymentUrl: string;
  amountCents: number;
  commissionCents: number;
  status: string;
  provider: string;
  providerInitPoint?: string | null;
  couponCode?: string | null;
};

export async function getCheckoutBranding(tenantId: string, storeId: string) {
  return jsonFetch<StoreCheckoutBranding>(
    `/stores/checkout-branding?${tenantStoreQuery(tenantId, storeId)}`,
  );
}

export async function updateCheckoutBranding(payload: {
  tenantId: string;
  storeId: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
  message?: string | null;
}) {
  return jsonFetch<StoreCheckoutBranding>('/stores/checkout-branding', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getMercadoPagoAuthorizeUrl(
  tenantId: string,
  storeId: string,
) {
  return jsonFetch<{ url: string; state: string }>(
    `/mercadopago/authorize-url?${tenantStoreQuery(tenantId, storeId)}`,
  );
}

export async function completeMercadoPagoOAuth(code: string, state: string) {
  return jsonFetch<{
    tenantId: string;
    storeId: string;
    status: string;
    accountLabel: string;
  }>('/mercadopago/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
    auth: false,
  });
}

export async function getMercadoPagoConnection(
  tenantId: string,
  storeId: string,
) {
  return jsonFetch<MercadoPagoConnection>(
    `/mercadopago/connection?${tenantStoreQuery(tenantId, storeId)}`,
  );
}

export async function disconnectMercadoPago(
  tenantId: string,
  storeId: string,
) {
  return jsonFetch<{ status: string }>(`/mercadopago/connection?${tenantStoreQuery(tenantId, storeId)}`, { method: 'DELETE' },
  );
}

export async function getPublicCheckout(token: string) {
  return jsonFetch<PublicCheckout>(
    `/checkouts/public/${encodeURIComponent(token)}`,
    { cache: 'no-store', auth: false },
  );
}

export async function getPublicOffer(storeSlug: string, coupon: string) {
  return jsonFetch<PublicOffer>(
    `/offers/public/${encodeURIComponent(storeSlug)}/${encodeURIComponent(coupon)}`,
    { cache: 'no-store', auth: false },
  );
}

export async function payPublicOffer(
  storeSlug: string,
  coupon: string,
  selectedAddonIds: string[] = [],
) {
  return jsonFetch<{ checkout_url: string }>(
    `/offers/public/${encodeURIComponent(storeSlug)}/${encodeURIComponent(coupon)}/pay`,
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ selectedAddonIds }),
    },
  );
}

export type TransparentPaymentResult = {
  paymentId: number;
  status: string;
  statusDetail: string | null;
  amountCents: number;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  pixTicketUrl: string | null;
};

export async function createTransparentOfferPayment(
  storeSlug: string,
  coupon: string,
  payload: {
    selectedAddonIds?: string[];
    paymentMethodId: string;
    token?: string;
    installments?: number;
    issuerId?: string;
    payerEmail: string;
    payerIdentification?: { type: string; number: string };
    fulfillmentMethod: 'pickup' | 'delivery';
    shippingAddress?: {
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
  },
) {
  return jsonFetch<TransparentPaymentResult>(
    `/offers/public/${encodeURIComponent(storeSlug)}/${encodeURIComponent(coupon)}/payments`,
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    },
  );
}

export async function getPublicOfferStatus(storeSlug: string, coupon: string) {
  return jsonFetch<PublicOfferStatus>(
    `/offers/public/${encodeURIComponent(storeSlug)}/${encodeURIComponent(coupon)}/status`,
    { cache: 'no-store', auth: false },
  );
}

export async function createApiCheckout(payload: {
  tenantId: string;
  storeId: string;
  customerId: string;
  productId?: string;
  productName?: string;
  amountCents?: number;
  interestId?: string;
  createdBy?: 'human' | 'ai';
}) {
  assertLojistaCannotDispatch();
  return jsonFetch<ApiCheckout>('/checkouts', {
    method: 'POST',
    body: JSON.stringify({ createdBy: 'human', ...payload }),
  });
}

// ---- Entrega e pedidos ----

export type StoreFulfillmentSettings = {
  storeId: string;
  deliveryEnabled: boolean;
  shippingCents: number;
  pickupAddressText: string | null;
  orderNotifyPhoneE164: string | null;
};

export async function getFulfillmentSettings(tenantId: string, storeId: string) {
  return jsonFetch<StoreFulfillmentSettings>(
    `/stores/fulfillment?${tenantStoreQuery(tenantId, storeId)}`,
  );
}

export async function updateFulfillmentSettings(payload: {
  tenantId: string;
  storeId: string;
  deliveryEnabled?: boolean;
  shippingCents?: number;
  pickupAddressText?: string | null;
  orderNotifyPhoneE164?: string | null;
}) {
  return jsonFetch<StoreFulfillmentSettings>('/stores/fulfillment', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type MerchantOrder = {
  id: string;
  couponCode: string | null;
  productName: string;
  amountCents: number;
  shippingCents: number;
  commissionCents: number;
  fulfillmentMethod: string | null;
  fulfillmentStatus: string | null;
  trackingCode?: string | null;
  mpPaymentId?: string | null;
  status?: string;
  shippingAddress: {
    recipientName: string;
    phoneE164: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  paidLines: PublicOfferPaidLine[];
  customerName: string;
  paidAt: string | null;
};

export async function listMerchantOrders(
  tenantId: string,
  storeId: string,
  fulfillmentStatus?: string,
) {
  const q = new URLSearchParams({ tenantId, storeId });
  if (fulfillmentStatus) q.set('fulfillmentStatus', fulfillmentStatus);
  return jsonFetch<MerchantOrder[]>(`/checkouts/orders?${q.toString()}`);
}

export async function updateOrderFulfillment(payload: {
  checkoutId: string;
  tenantId: string;
  storeId: string;
  status: 'ready' | 'shipped' | 'done';
  trackingCode?: string;
}) {
  return jsonFetch<{ id: string; fulfillmentStatus: string }>(
    `/checkouts/${encodeURIComponent(payload.checkoutId)}/fulfillment`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        tenantId: payload.tenantId,
        storeId: payload.storeId,
        status: payload.status,
        ...(payload.trackingCode != null
          ? { trackingCode: payload.trackingCode }
          : {}),
      }),
    },
  );
}

export async function cancelMerchantOrder(payload: {
  checkoutId: string;
  tenantId: string;
  storeId: string;
}) {
  return jsonFetch<{ id: string; status: string; already: boolean }>(
    `/checkouts/${encodeURIComponent(payload.checkoutId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({
        tenantId: payload.tenantId,
        storeId: payload.storeId,
      }),
    },
  );
}

// ---- Clientes (API real) ----

export type ApiInterest = {
  id: string;
  productId: string | null;
  productNameSnapshot: string;
  productPriceCents: number | null;
  source: string;
  status: string;
  notes: string | null;
  interestedAt: string;
};

export type ApiSale = {
  id: string;
  productId: string;
  amountCents: number;
  source: string;
  soldAt: string;
  product?: { id: string; name: string; category: string | null } | null;
};

export type ApiCheckoutRecord = {
  id: string;
  productNameSnapshot: string;
  amountCents: number;
  status: string;
  paymentUrl: string;
  provider: string;
  commissionCents: number;
  commissionRateBps: number;
  interestId: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
};

export type ApiCustomerEvent = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  occurredAt: string;
};

export type ApiCustomerSummary = {
  id: string;
  displayName: string;
  phoneMasked: string | null;
  optedOutAt: string | null;
  createdAt: string;
  customerInterests: ApiInterest[];
  sales: ApiSale[];
  checkouts: { id: string; status: string; createdAt: string }[];
  outreachMessages?: {
    id: string;
    repliedAt: string | null;
    sentAt: string | null;
  }[];
  _count: { sales: number; customerInterests: number; checkouts: number };
};

export type ApiCustomerDetail = {
  id: string;
  displayName: string;
  phoneMasked: string | null;
  notes: string | null;
  optedOutAt: string | null;
  createdAt: string;
  customerInterests: ApiInterest[];
  sales: ApiSale[];
  checkouts: ApiCheckoutRecord[];
  customerEvents: ApiCustomerEvent[];
};

export async function listApiCustomers(tenantId: string, storeId: string) {
  return jsonFetch<ApiCustomerSummary[]>(`/customers?${tenantStoreQuery(tenantId, storeId)}`, { cache: 'no-store' },
  );
}

export async function getApiCustomer(tenantId: string, customerId: string) {
  return jsonFetch<ApiCustomerDetail>(
    `/customers/${encodeURIComponent(customerId)}?tenantId=${encodeURIComponent(tenantId)}`,
    { cache: 'no-store' },
  );
}

export async function createApiCustomer(payload: {
  tenantId: string;
  storeId: string;
  displayName: string;
  phone: string;
  notes?: string;
  interestProductId?: string;
  interestProductName?: string;
}) {
  return jsonFetch<ApiCustomerDetail>('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteApiCustomer(tenantId: string, customerId: string) {
  return jsonFetch<{ ok: boolean }>(`/customers/${encodeURIComponent(customerId)}?tenantId=${encodeURIComponent(tenantId)}`, { method: 'DELETE' },
  );
}

export async function setApiCustomerOptOut(
  tenantId: string,
  customerId: string,
  optedOut: boolean,
) {
  return jsonFetch<{ id: string; optedOutAt: string | null }>(
    `/customers/${encodeURIComponent(customerId)}/opt-out`,
    { method: 'POST', body: JSON.stringify({ tenantId, optedOut }) },
  );
}

export async function addApiInterest(payload: {
  tenantId: string;
  storeId: string;
  customerId: string;
  productId?: string;
  productName?: string;
  productPriceCents?: number;
  notes?: string;
}) {
  return jsonFetch<ApiInterest>('/customers/interests', {
    method: 'POST',
    body: JSON.stringify({ source: 'walk_in', ...payload }),
  });
}

export async function createApiSale(payload: {
  tenantId: string;
  storeId: string;
  customerId: string;
  productId: string;
  amountCents: number;
}) {
  return jsonFetch<ApiSale>('/sales', {
    method: 'POST',
    body: JSON.stringify({ source: 'in_store', ...payload }),
  });
}

export async function markApiCheckoutPaid(tenantId: string, checkoutId: string) {
  return jsonFetch<{ id: string; status: string }>(
    `/checkouts/${encodeURIComponent(checkoutId)}/mark-paid`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

// ---- Produtos (API real) ----

export type ApiProduct = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  priceCents: number;
  costCents: number | null;
  maxDiscountBps: number | null;
  availability: 'available' | 'unavailable';
  sellableByAi: boolean;
  stock: number;
  active: boolean;
  priceFloorCents: number;
  effectiveMaxDiscountBps: number;
};

export async function listApiProducts(tenantId: string, storeId: string) {
  return jsonFetch<ApiProduct[]>(
    `/products?${tenantStoreQuery(tenantId, storeId)}`,
    { cache: 'no-store' },
  );
}

export async function createApiProduct(payload: {
  tenantId: string;
  storeId: string;
  name: string;
  sku?: string;
  category?: string;
  priceCents: number;
  costCents?: number;
  maxDiscountBps?: number;
  availability?: 'available' | 'unavailable';
  sellableByAi?: boolean;
  stock?: number;
  active?: boolean;
}) {
  return jsonFetch<ApiProduct>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateApiProduct(
  tenantId: string,
  productId: string,
  payload: Partial<{
    name: string;
    sku: string | null;
    category: string | null;
    priceCents: number;
    costCents: number | null;
    maxDiscountBps: number | null;
    availability: 'available' | 'unavailable';
    sellableByAi: boolean;
    stock: number;
    active: boolean;
  }>,
) {
  return jsonFetch<ApiProduct>(`/products/${encodeURIComponent(productId)}?tenantId=${encodeURIComponent(tenantId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

// ---- Regras da loja (API real) ----

export type StoreRules = {
  sobreNegocio?: string;
  personalidade?: string;
  instrucoesExtras?: string;
  horaInicio?: string;
  horaFim?: string;
  diasAtivos?: string[];
  followUpDias?: string;
  descontoPadrao?: string;
  margemMaxima?: string;
  maxDescontoUmProduto?: string;
  maxDescontoDoisOuMais?: string;
  aniversario?: boolean;
  cupons?: { id: string; codigo: string; desconto: string; validade: string }[];
};

export async function getStoreRules(tenantId: string, storeId: string) {
  return jsonFetch<{ rules: StoreRules | null; updatedAt: string | null }>(
    `/stores/rules?${tenantStoreQuery(tenantId, storeId)}`,
    { cache: 'no-store' },
  );
}

export async function saveStoreRules(
  tenantId: string,
  storeId: string,
  rules: StoreRules,
) {
  return jsonFetch<{ rules: StoreRules; updatedAt: string }>('/stores/rules', {
    method: 'PUT',
    body: JSON.stringify({ tenantId, storeId, rules }),
  });
}

// ---- Segmentação e campanhas ----

export type SegmentId =
  | 'checkout_pendente'
  | 'interesse_aberto'
  | 'inativos'
  | 'sem_compra';

export type SegmentCustomer = {
  customerId: string;
  displayName: string;
  phoneMasked: string | null;
  segment: SegmentId;
  reason: string;
  productName: string | null;
  lastSaleAt: string | null;
  totalSpentCents: number;
  purchases: number;
  optedOut: boolean;
  readyToContact: boolean;
};

export type SegmentsResult = {
  followUpDays: number;
  segments: { id: SegmentId; label: string; description: string; count: number }[];
  customers: SegmentCustomer[];
  readyToContact: number;
};

export async function getSegments(tenantId: string, storeId: string) {
  return jsonFetch<SegmentsResult>(`/customers/segments?${tenantStoreQuery(tenantId, storeId)}`, { cache: 'no-store' },
  );
}

export type ApiCampaign = {
  id: string;
  name: string;
  status: string;
  kind: string;
  segment: string | null;
  messageTemplate: string | null;
  createdAt: string;
  counts: {
    total: number;
    pendingApproval: number;
    approved: number;
    sent: number;
    replied: number;
    rejected: number;
    failed: number;
  };
};

export type OutreachMessage = {
  id: string;
  body: string;
  status: string;
  failReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  sentAt: string | null;
  customer: {
    id: string;
    displayName: string;
    phoneMasked: string | null;
    optedOut: boolean;
  };
  campaign: { id: string; name: string; kind: string; segment: string | null };
};

export async function listCampaigns(tenantId: string, storeId: string) {
  return jsonFetch<ApiCampaign[]>(
    `/campaigns?${tenantStoreQuery(tenantId, storeId)}`,
    { cache: 'no-store' },
  );
}

export async function createCampaign(payload: {
  tenantId: string;
  storeId: string;
  name: string;
  segment: SegmentId | 'todos';
  messageTemplate: string;
  autoApprove?: boolean;
}) {
  assertLojistaCannotDispatch();
  return jsonFetch<{
    id: string;
    name: string;
    status: string;
    messagesCreated: number;
  }>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listOutreachMessages(
  tenantId: string,
  storeId: string,
  status?: string,
) {
  const params = new URLSearchParams({ tenantId, storeId });
  if (status) params.set('status', status);
  return jsonFetch<OutreachMessage[]>(`/campaigns/messages?${params}`, {
    cache: 'no-store',
  });
}

export async function approveOutreachMessage(tenantId: string, id: string) {
  assertLojistaCannotDispatch();
  return jsonFetch<OutreachMessage>(
    `/campaigns/messages/${encodeURIComponent(id)}/approve`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function rejectOutreachMessage(tenantId: string, id: string) {
  assertLojistaCannotDispatch();
  return jsonFetch<OutreachMessage>(
    `/campaigns/messages/${encodeURIComponent(id)}/reject`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function approveAllOutreach(
  tenantId: string,
  storeId: string,
  campaignId?: string,
) {
  assertLojistaCannotDispatch();
  return jsonFetch<{ approved: number }>('/campaigns/approve-all', {
    method: 'POST',
    body: JSON.stringify({ tenantId, storeId, campaignId }),
  });
}

// ---- Métricas do dashboard ----

export type DashboardMetrics = {
  range: { from: string; to: string };
  kpis: {
    recoveredRevenueCents: number;
    merchantRecoveredCents?: number;
    commissionCents: number;
    salesConfirmed?: number;
    clickToPurchaseRate?: number;
    messagesSent: number;
    interests: number;
    returnedCustomers: number;
    returnRate: number;
    readyToContact: number;
    pendingRevenueCents: number;
    inactiveCustomers: number;
  };
  funnel: {
    contacted: number;
    interested: number;
    checkoutsSent: number;
    checkoutsPaid: number;
    checkoutsClicked?: number;
  };
  series: {
    label: string;
    receitaCents: number;
    envios: number;
    retornos: number;
  }[];
  topProducts: {
    productId: string;
    nome: string;
    categoria: string;
    contatos: number;
    interesses: number;
    retornos: number;
    receitaCents: number;
  }[];
  categories: {
    categoria: string;
    contatos: number;
    interesses: number;
    retornos: number;
    receitaCents: number;
    taxaRetorno: number;
  }[];
  recentSales?: {
    id: string;
    customerName: string;
    productName: string;
    amountCents: number;
    merchantCents: number;
    commissionCents: number;
    status: string;
    soldAt: string;
    source: string;
  }[];
};

export async function getDashboardMetrics(
  tenantId: string,
  storeId: string,
  from?: string,
  to?: string,
) {
  const params = new URLSearchParams({ tenantId, storeId });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return jsonFetch<DashboardMetrics>(`/metrics/dashboard?${params}`, {
    cache: 'no-store',
  });
}



export async function fetchAuthMe(accessToken?: string) {
  const token = accessToken ?? getStoredAccessToken();
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return jsonFetch<{
    user: {
      id: string;
      email: string;
      ownerName: string;
      storeName: string;
      tenantId: string;
      storeId: string | null;
    };
  }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    auth: false,
  });
}

/** Sempre valida o token via /auth/me; nunca confia só no localStorage. */
export async function resolveTenantContext() {
  if (typeof window === 'undefined') {
    return { tenantId: null as string | null, storeId: null as string | null };
  }

  const token = getStoredAccessToken();
  if (!token) {
    clearClientSession();
    return { tenantId: null, storeId: null };
  }

  try {
    const { user } = await fetchAuthMe(token);
    window.localStorage.setItem('voltou_tenant_id', user.tenantId);
    if (user.storeId) {
      window.localStorage.setItem('voltou_store_id', user.storeId);
    } else {
      window.localStorage.removeItem('voltou_store_id');
    }
    return { tenantId: user.tenantId, storeId: user.storeId };
  } catch {
    clearClientSession();
    return { tenantId: null, storeId: null };
  }
}

export { API_URL };
