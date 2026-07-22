const fs = require("fs");
const path = "C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts";
let s = fs.readFileSync(
  "C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts.corrupt.bak",
  "utf8",
);

const helpers = `
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

async function jsonFetch<T>(apiPath: string, init: JsonFetchInit = {}): Promise<T> {
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
    headers.set('Authorization', \`Bearer \${token}\`);
  }
  const { auth: _auth, ...rest } = init;
  const res = await fetch(\`\${API_URL}\${apiPath}\`, { ...rest, headers });
  if (res.status === 401 && auth) {
    clearClientSession();
  }
  return parseJson<T>(res);
}

`;

// Insert helpers after parseJson block
s = s.replace(
  /(async function parseJson[\s\S]*?^}\n)/m,
  `$1${helpers}`,
);

// Fix: return jsonFetch<WRONG>(...); return parseJson<RIGHT>(res);  => jsonFetch<RIGHT>
s = s.replace(
  /return jsonFetch<[^>]+>\(([\s\S]*?)\);\s*\r?\n\s*return parseJson<([^>]+)>\(res\);/g,
  "return jsonFetch<$2>($1);",
);

// Fix changePassword to use auth:false (has its own Bearer)
s = s.replace(
  /(export async function changePassword[\s\S]*?return jsonFetch<\{ message: string \}>\('\/auth\/change-password', \{[\s\S]*?body: JSON\.stringify\(payload\),)\s*\n(\s*)\}\);/,
  `$1\n$2  auth: false,\n$2});`,
);

// Convert remaining raw fetch(`${API_URL}...`) + parseJson to jsonFetch
// Multiline fetch with options
s = s.replace(
  /const res = await fetch\(\s*`\$\{API_URL\}(\/[^`]+)`\s*,\s*(\{[\s\S]*?\})\s*\);\s*\r?\n\s*return parseJson<([^>]+)>\(res\);/g,
  (m, p, opts, type) => {
    const pub =
      /\/auth\/(register|login|forgot-password|verify-email)/.test(p) ||
      /\/checkouts\/public\//.test(p) ||
      (/\/(bling|mercadopago)\/callback/.test(p) && /POST/.test(opts));
    if (pub) return `return jsonFetch<${type}>(\`${p}\`, { ...${opts}, auth: false });`;
    return `return jsonFetch<${type}>(\`${p}\`, ${opts});`;
  },
);

// fetch without options
s = s.replace(
  /const res = await fetch\(\s*`\$\{API_URL\}(\/[^`]+)`\s*\);\s*\r?\n\s*return parseJson<([^>]+)>\(res\);/g,
  (m, p, type) => `return jsonFetch<${type}>(\`${p}\`);`,
);

// Broken functions that end with fetch but no return - known map
const repairs = [
  [
    /export async function createWhatsappSession\(payload: \{[\s\S]*?\}\) \{\s*const res = await fetch\(`\$\{API_URL\}\/whatsapp\/sessions`, \{[\s\S]*?\}\);\s*\}/,
    `export async function createWhatsappSession(payload: {
  tenantId: string;
  storeId: string;
  label: string;
}) {
  return jsonFetch<WhatsappConnection>('/whatsapp/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}`,
  ],
  [
    /export async function previewImport\(payload: \{[\s\S]*?\}\) \{\s*const res = await fetch\(`\$\{API_URL\}\/imports\/preview`, \{[\s\S]*?\}\);\s*\}/,
    `export async function previewImport(payload: {
  tenantId: string;
  storeId: string;
  files: { name: string; content: string }[];
}) {
  return jsonFetch<ImportPreviewResult>('/imports/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}`,
  ],
  [
    /export async function completeBlingOAuth\(code: string, state: string\) \{\s*const res = await fetch\(`\$\{API_URL\}\/bling\/callback`, \{[\s\S]*?\}\);\s*\}/,
    `export async function completeBlingOAuth(code: string, state: string) {
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
}`,
  ],
  [
    /export async function syncBlingProducts\(tenantId: string, storeId: string\) \{\s*const res = await fetch\(`\$\{API_URL\}\/bling\/sync`, \{[\s\S]*?\}\);\s*\}/,
    `export async function syncBlingProducts(tenantId: string, storeId: string) {
  return jsonFetch<BlingSyncSummary>('/bling/sync', {
    method: 'POST',
    body: JSON.stringify({ tenantId, storeId }),
  });
}`,
  ],
  [
    /export async function createApiCheckout\(payload: \{[\s\S]*?\}\) \{\s*const res = await fetch\(`\$\{API_URL\}\/checkouts`, \{[\s\S]*?\}\);\s*\}/,
    `export async function createApiCheckout(payload: {
  tenantId: string;
  storeId: string;
  customerId: string;
  productId?: string;
  productName?: string;
  amountCents?: number;
  interestId?: string;
  createdBy?: 'human' | 'ai';
}) {
  return jsonFetch<ApiCheckout>('/checkouts', {
    method: 'POST',
    body: JSON.stringify({ createdBy: 'human', ...payload }),
  });
}`,
  ],
  [
    /export async function createApiCustomer\(payload: \{[\s\S]*?\}\) \{\s*const res = await fetch\(`\$\{API_URL\}\/customers`, \{[\s\S]*?\}\);\s*\}/,
    `export async function createApiCustomer(payload: {
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
}`,
  ],
  [
    /export async function addApiInterest\(payload: \{[\s\S]*?\}\) \{\s*const res = await fetch\(`\$\{API_URL\}\/customers\/interests`, \{[\s\S]*?\}\);\s*\}/,
    `export async function addApiInterest(payload: {
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
}`,
  ],
  [
    /export async function createApiProduct\(payload: \{[\s\S]*?\}\) \{\s*const res = await fetch\(`\$\{API_URL\}\/products`, \{[\s\S]*?\}\);\s*\}/,
    `export async function createApiProduct(payload: {
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
}`,
  ],
  [
    /export async function saveStoreRules\(\s*tenantId: string,\s*storeId: string,\s*rules: StoreRules,\s*\) \{\s*const res = await fetch\(`\$\{API_URL\}\/stores\/rules`, \{[\s\S]*?\}\);\s*\}/,
    `export async function saveStoreRules(
  tenantId: string,
  storeId: string,
  rules: StoreRules,
) {
  return jsonFetch<{ rules: StoreRules; updatedAt: string }>('/stores/rules', {
    method: 'PUT',
    body: JSON.stringify({ tenantId, storeId, rules }),
  });
}`,
  ],
  [
    /export async function createCampaign\(payload: \{[\s\S]*?\}\) \{\s*const res = await fetch\(`\$\{API_URL\}\/campaigns`, \{[\s\S]*?\}\);\s*\}/,
    `export async function createCampaign(payload: {
  tenantId: string;
  storeId: string;
  name: string;
  segment: SegmentId | 'todos';
  messageTemplate: string;
  autoApprove?: boolean;
}) {
  return jsonFetch<{
    id: string;
    name: string;
    status: string;
    messagesCreated: number;
  }>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}`,
  ],
  [
    /export async function approveAllOutreach\(\s*tenantId: string,\s*storeId: string,\s*campaignId\?: string,\s*\) \{\s*const res = await fetch\(`\$\{API_URL\}\/campaigns\/approve-all`, \{[\s\S]*?\}\);\s*\}/,
    `export async function approveAllOutreach(
  tenantId: string,
  storeId: string,
  campaignId?: string,
) {
  return jsonFetch<{ approved: number }>('/campaigns/approve-all', {
    method: 'POST',
    body: JSON.stringify({ tenantId, storeId, campaignId }),
  });
}`,
  ],
];

for (const [re, rep] of repairs) {
  if (!re.test(s)) {
    console.warn("repair miss:", String(re).slice(0, 80));
  } else {
    s = s.replace(re, rep);
    console.log("repaired", String(re).slice(0, 60));
  }
}

// Replace trailing fetchAuthMe/resolveTenantContext with secure versions
const tailStart = s.indexOf("export async function fetchAuthMe");
if (tailStart >= 0) {
  s =
    s.slice(0, tailStart) +
    `
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
    headers: { Authorization: \`Bearer \${token}\` },
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
`;
}

// Clean awkward "{ ...{ " spreads from earlier transform
s = s.replace(
  /return jsonFetch<([^>]+)>\(`([^`]+)`, \{ \.\.\.\{([\s\S]*?)\}, auth: false \}\);/g,
  "return jsonFetch<$1>(`$2`, {$3, auth: false });",
);

fs.writeFileSync(path, s);
const left = (s.match(/fetch\(`\$\{API_URL\}/g) || []).length;
const orphans = (s.match(/return parseJson<[^>]+>\(res\);/g) || []).length;
const jsonFetchUses = (s.match(/jsonFetch</g) || []).length;
console.log({ left, orphans, jsonFetchUses, len: s.length });
