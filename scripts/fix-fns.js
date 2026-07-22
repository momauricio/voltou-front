const fs = require("fs");
const path = "C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts";
let s = fs.readFileSync(path, "utf8");

// Convert ANY remaining `const res = await fetch(\`${API_URL}/...` blocks
s = s.replace(
  /const res = await fetch\(\s*\n?\s*`\$\{API_URL\}([^`]+)`\s*,?\s*(\{[\s\S]*?\})?\s*\);\s*\n(?:\s*return parseJson<([^>]+)>\(res\);\s*\n)?/g,
  (m, p, opts, type) => {
    const t = type || "unknown";
    const pub = /\/checkouts\/public\//.test(p);
    if (!opts) {
      return pub
        ? `return jsonFetch<${t}>(\`${p}\`, { auth: false });\n`
        : `return jsonFetch<${t}>(\`${p}\`);\n`;
    }
    let clean = opts
      .replace(/\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},?/g, "")
      .trim();
    if (pub) {
      return `return jsonFetch<${t}>(\`${p}\`, { ...${clean}, auth: false });\n`;
    }
    return `return jsonFetch<${t}>(\`${p}\`, ${clean});\n`;
  },
);

const replacements = [
  [
    /export async function getWhatsappQr\([\s\S]*?\n\}/,
    `export async function getWhatsappQr(tenantId: string, sessionName: string) {
  return jsonFetch<WhatsappQr>(
    \`/whatsapp/sessions/\${encodeURIComponent(sessionName)}/qr?tenantId=\${encodeURIComponent(tenantId)}\`,
    { cache: 'no-store' },
  );
}`,
  ],
  [
    /export async function disconnectWhatsappSession\([\s\S]*?\n\}/,
    `export async function disconnectWhatsappSession(
  tenantId: string,
  sessionName: string,
) {
  return jsonFetch<{ id: string; status: string }>(
    \`/whatsapp/sessions/\${encodeURIComponent(sessionName)}/disconnect\`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}`,
  ],
  [
    /export async function deleteWhatsappConnection\([\s\S]*?\n\}/,
    `export async function deleteWhatsappConnection(
  tenantId: string,
  connectionId: string,
) {
  return jsonFetch<{ ok: boolean }>(
    \`/whatsapp/connections/\${encodeURIComponent(connectionId)}?tenantId=\${encodeURIComponent(tenantId)}\`,
    { method: 'DELETE' },
  );
}`,
  ],
  [
    /export async function getBlingAuthorizeUrl\([\s\S]*?\n\}/,
    `export async function getBlingAuthorizeUrl(tenantId: string, storeId: string) {
  return jsonFetch<{ url: string; state: string }>(
    \`/bling/authorize-url?\${tenantStoreQuery(tenantId, storeId)}\`,
  );
}`,
  ],
  [
    /export async function getBlingConnection\([\s\S]*?\n\}/,
    `export async function getBlingConnection(tenantId: string, storeId: string) {
  return jsonFetch<BlingConnection>(
    \`/bling/connection?\${tenantStoreQuery(tenantId, storeId)}\`,
  );
}`,
  ],
  [
    /export async function getCheckoutBranding\([\s\S]*?\n\}/,
    `export async function getCheckoutBranding(tenantId: string, storeId: string) {
  return jsonFetch<StoreCheckoutBranding>(
    \`/stores/checkout-branding?\${tenantStoreQuery(tenantId, storeId)}\`,
  );
}`,
  ],
  [
    /export async function updateCheckoutBranding\([\s\S]*?\n\}/,
    `export async function updateCheckoutBranding(payload: {
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
}`,
  ],
  [
    /export async function getMercadoPagoAuthorizeUrl\([\s\S]*?\n\}/,
    `export async function getMercadoPagoAuthorizeUrl(
  tenantId: string,
  storeId: string,
) {
  return jsonFetch<{ url: string; state: string }>(
    \`/mercadopago/authorize-url?\${tenantStoreQuery(tenantId, storeId)}\`,
  );
}`,
  ],
  [
    /export async function completeMercadoPagoOAuth\([\s\S]*?\n\}/,
    `export async function completeMercadoPagoOAuth(code: string, state: string) {
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
}`,
  ],
  [
    /export async function getMercadoPagoConnection\([\s\S]*?\n\}/,
    `export async function getMercadoPagoConnection(
  tenantId: string,
  storeId: string,
) {
  return jsonFetch<MercadoPagoConnection>(
    \`/mercadopago/connection?\${tenantStoreQuery(tenantId, storeId)}\`,
  );
}`,
  ],
  [
    /export async function getApiCustomer\([\s\S]*?\n\}/,
    `export async function getApiCustomer(tenantId: string, customerId: string) {
  return jsonFetch<ApiCustomerDetail>(
    \`/customers/\${encodeURIComponent(customerId)}?tenantId=\${encodeURIComponent(tenantId)}\`,
    { cache: 'no-store' },
  );
}`,
  ],
  [
    /export async function setApiCustomerOptOut\([\s\S]*?\n\}/,
    `export async function setApiCustomerOptOut(
  tenantId: string,
  customerId: string,
  optedOut: boolean,
) {
  return jsonFetch<{ id: string; optedOutAt: string | null }>(
    \`/customers/\${encodeURIComponent(customerId)}/opt-out\`,
    { method: 'POST', body: JSON.stringify({ tenantId, optedOut }) },
  );
}`,
  ],
  [
    /export async function createApiSale\([\s\S]*?\n\}/,
    `export async function createApiSale(payload: {
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
}`,
  ],
  [
    /export async function markApiCheckoutPaid\([\s\S]*?\n\}/,
    `export async function markApiCheckoutPaid(tenantId: string, checkoutId: string) {
  return jsonFetch<{ id: string; status: string }>(
    \`/checkouts/\${encodeURIComponent(checkoutId)}/mark-paid\`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}`,
  ],
  [
    /export async function listApiProducts\([\s\S]*?\n\}/,
    `export async function listApiProducts(tenantId: string, storeId: string) {
  return jsonFetch<ApiProduct[]>(
    \`/products?\${tenantStoreQuery(tenantId, storeId)}\`,
    { cache: 'no-store' },
  );
}`,
  ],
  [
    /export async function getStoreRules\([\s\S]*?\n\}/,
    `export async function getStoreRules(tenantId: string, storeId: string) {
  return jsonFetch<{ rules: StoreRules | null; updatedAt: string | null }>(
    \`/stores/rules?\${tenantStoreQuery(tenantId, storeId)}\`,
    { cache: 'no-store' },
  );
}`,
  ],
  [
    /export async function listCampaigns\([\s\S]*?\n\}/,
    `export async function listCampaigns(tenantId: string, storeId: string) {
  return jsonFetch<ApiCampaign[]>(
    \`/campaigns?\${tenantStoreQuery(tenantId, storeId)}\`,
    { cache: 'no-store' },
  );
}`,
  ],
  [
    /export async function listOutreachMessages\([\s\S]*?\n\}/,
    `export async function listOutreachMessages(
  tenantId: string,
  storeId: string,
  status?: string,
) {
  const params = new URLSearchParams({ tenantId, storeId });
  if (status) params.set('status', status);
  return jsonFetch<OutreachMessage[]>(\`/campaigns/messages?\${params}\`, {
    cache: 'no-store',
  });
}`,
  ],
  [
    /export async function approveOutreachMessage\([\s\S]*?\n\}/,
    `export async function approveOutreachMessage(tenantId: string, id: string) {
  return jsonFetch<OutreachMessage>(
    \`/campaigns/messages/\${encodeURIComponent(id)}/approve\`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}`,
  ],
  [
    /export async function rejectOutreachMessage\([\s\S]*?\n\}/,
    `export async function rejectOutreachMessage(tenantId: string, id: string) {
  return jsonFetch<OutreachMessage>(
    \`/campaigns/messages/\${encodeURIComponent(id)}/reject\`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}`,
  ],
];

for (const [re, rep] of replacements) {
  if (!re.test(s)) console.warn("MISS", String(re).slice(0, 70));
  else {
    s = s.replace(re, rep);
    console.log("OK", String(re).slice(0, 50));
  }
}

fs.writeFileSync(path, s);
console.log("remaining API_URL fetch", (s.match(/fetch\(\s*`\$\{API_URL\}/g) || []).length);
console.log("parseJson(res)", (s.match(/parseJson<[^>]+>\(res\)/g) || []).length);
