/**
 * Rebuilds api.ts from corrupt backup signatures + secure authFetch.
 */
const fs = require("fs");
const corrupt = fs.readFileSync(
  "C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts.corrupt.bak",
  "utf8",
);

// Extract type blocks and signatures; rewrite all function bodies cleanly.
const header = `const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
      : data.message || data.error || \`Erro HTTP \${res.status}\`;
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

function isPublicApiUrl(url: string) {
  return (
    /\\/auth\\/(register|login|forgot-password|verify-email)(?:\\?|$)/.test(url) ||
    /\\/checkouts\\/public\\//.test(url) ||
    /\\/(bling|mercadopago)\\/callback(?:\\?|$)/.test(url)
  );
}

async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const pub = isPublicApiUrl(input);
  if (!pub) {
    const token = getStoredAccessToken();
    if (!token) {
      clearClientSession();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    headers.set('Authorization', \`Bearer \${token}\`);
  }
  const res = await fetch(input, { ...init, headers });
  if (!pub && res.status === 401) {
    clearClientSession();
  }
  return res;
}

`;

// Original pre-corruption function bodies (from conversation snapshot)
const bodies = `
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
  const res = await authFetch(\`\${API_URL}/auth/register\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<RegisterResponse>(res);
}

export async function loginAccount(payload: LoginPayload) {
  const res = await authFetch(\`\${API_URL}/auth/login\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<LoginResponse>(res);
}

export async function requestPasswordReset(email: string) {
  const res = await authFetch(\`\${API_URL}/auth/forgot-password\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseJson<{ message: string }>(res);
}

export async function verifyEmail(token: string) {
  const res = await authFetch(\`\${API_URL}/auth/verify-email\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return parseJson<{ message: string }>(res);
}

export async function changePassword(
  accessToken: string,
  payload: { currentPassword: string; newPassword: string },
) {
  const res = await fetch(\`\${API_URL}/auth/change-password\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${accessToken}\`,
    },
    body: JSON.stringify(payload),
  });
  return parseJson<{ message: string }>(res);
}
`;

// Extract from corrupt everything from WhatsappConnection type to before fetchAuthMe
const start = corrupt.indexOf("export type WhatsappConnection");
const end = corrupt.indexOf("export async function fetchAuthMe");
if (start < 0 || end < 0) {
  console.error("markers missing", start, end);
  process.exit(1);
}
let mid = corrupt.slice(start, end);

// Fix mid: convert broken patterns to authFetch
// 1. Remove orphan "return parseJson...(res);" that follow jsonFetch returns
mid = mid.replace(
  /return jsonFetch<[^>]+>\(`([^`]+)`\s*,\s*([\s\S]*?)\);\s*\n\s*return parseJson<[^>]+>\(res\);/g,
  (m, path, opts) => {
    const cleanOpts = opts.replace(/,\s*auth:\s*false/, "").trim();
    if (cleanOpts === "{ cache: 'no-store' },") {
      return `const res = await authFetch(\`\${API_URL}${path}\`, { cache: 'no-store' });\n  return parseJson<any>(res);`;
    }
    return m; // leave for manual
  },
);

fs.writeFileSync(
  "C:/Users/Maurício/Projects/voltou-web/src/lib/api.partial.txt",
  mid.slice(0, 2000),
);
console.log("mid length", mid.length);
console.log("sample fixed?", mid.includes("authFetch"));
