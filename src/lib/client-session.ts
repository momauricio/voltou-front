export type SessionKind = 'lojista' | 'staff';

export type SessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** Origin-wide lojista keys — must never be written by a staff login. */
export const LOJISTA_STORAGE_KEYS = {
  token: 'voltou_token',
  tenantId: 'voltou_tenant_id',
  storeId: 'voltou_store_id',
} as const;

/** Staff keys — isolated so /equipe/entrar cannot clobber /painel. */
export const STAFF_STORAGE_KEYS = {
  token: 'voltou_staff_token',
  tenantId: 'voltou_staff_tenant_id',
  storeId: 'voltou_staff_store_id',
} as const;

export function keysFor(kind: SessionKind) {
  return kind === 'staff' ? STAFF_STORAGE_KEYS : LOJISTA_STORAGE_KEYS;
}

export function sessionKindFromPath(pathname: string): SessionKind {
  return pathname.startsWith('/equipe') ? 'staff' : 'lojista';
}

export function applySessionToStorage(
  storage: SessionStorage,
  kind: SessionKind,
  result: {
    accessToken: string;
    user: { tenantId: string; storeId: string | null };
  },
) {
  const keys = keysFor(kind);
  storage.setItem(keys.token, result.accessToken);
  storage.setItem(keys.tenantId, result.user.tenantId);
  if (result.user.storeId) {
    storage.setItem(keys.storeId, result.user.storeId);
  } else {
    storage.removeItem(keys.storeId);
  }
}

export function clearSessionFromStorage(
  storage: SessionStorage,
  kind: SessionKind,
) {
  const keys = keysFor(kind);
  storage.removeItem(keys.token);
  storage.removeItem(keys.tenantId);
  storage.removeItem(keys.storeId);
}

export function readTokenFromStorage(
  storage: SessionStorage,
  kind: SessionKind,
) {
  return storage.getItem(keysFor(kind).token);
}

export function readTenantContextFromStorage(
  storage: SessionStorage,
  kind: SessionKind,
) {
  const keys = keysFor(kind);
  return {
    tenantId: storage.getItem(keys.tenantId),
    storeId: storage.getItem(keys.storeId),
  };
}
