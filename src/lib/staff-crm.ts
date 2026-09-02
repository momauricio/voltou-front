export const PUBLIC_OFFER_ORIGIN = 'https://www.voltouapp.com';

export const LOJISTA_SESSION_MESSAGE =
  'Esta área é da equipe Voltou. Você está em uma sessão de lojista — entre com uma conta da equipe para ver os clientes e emitir o link de pagamento.';

export function isStaffRole(role?: string | null): boolean {
  return role === 'staff';
}

export function homePathForRole(role?: string | null): string {
  return isStaffRole(role) ? '/equipe' : '/painel';
}

export function formatStaffLastContacted(
  iso?: string | null,
): string {
  if (!iso) return 'ainda não';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'ainda não';
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return `contatado em ${formatted}`;
}

export function staffCheckoutPublicUrl(opts: {
  storeSlug?: string | null;
  couponCode?: string | null;
  paymentUrl?: string | null;
}): string | null {
  if (opts.storeSlug && opts.couponCode) {
    return `${PUBLIC_OFFER_ORIGIN}/loja/${opts.storeSlug}/${opts.couponCode}`;
  }
  return opts.paymentUrl ?? null;
}

export function resolveStaffStoreSlug(
  customer: { storeId: string; store?: { id: string; slug?: string | null } | null },
  stores: { id: string; slug?: string | null }[],
): string | null {
  const fromCustomer = customer.store?.slug?.trim();
  if (fromCustomer) return fromCustomer;
  const fromStores = stores.find((store) => store.id === customer.storeId)?.slug?.trim();
  return fromStores || null;
}

export function storeDisplayName(input: {
  store?: { name?: string | null } | null;
  tenant?: { name?: string | null } | null;
}): string {
  const store = input.store?.name?.trim() || '';
  const tenant = input.tenant?.name?.trim() || '';
  if (store && tenant && store !== tenant) return `${store} · ${tenant}`;
  return store || tenant || 'Loja';
}

export function staffCustomerPhone(input: {
  phoneE164?: string | null;
  phoneMasked?: string | null;
}): string {
  const e164 = input.phoneE164?.trim();
  if (e164) return formatE164Br(e164);
  return input.phoneMasked?.trim() || '—';
}

function formatE164Br(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const area = digits.slice(2, 4);
    const local = digits.slice(4);
    const split = local.length === 9 ? 5 : 4;
    return `+55 ${area} ${local.slice(0, split)}-${local.slice(split)}`;
  }
  return phone;
}

export function parseReaisToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}
