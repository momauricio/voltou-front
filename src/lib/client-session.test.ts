import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  LOJISTA_STORAGE_KEYS,
  STAFF_STORAGE_KEYS,
  applySessionToStorage,
  clearSessionFromStorage,
  sessionKindFromPath,
  type SessionStorage,
} from './client-session.ts';

function memoryStorage(): SessionStorage & { snapshot: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    snapshot: () => Object.fromEntries(map),
  };
}

const lojistaUser = {
  accessToken: 'lojista-jwt',
  user: { tenantId: 't-loja', storeId: 's-loja' },
};

const staffUser = {
  accessToken: 'staff-jwt',
  user: { tenantId: 't-staff', storeId: null as string | null },
};

describe('session storage keys', () => {
  it('keeps staff keys distinct from the origin-wide lojista keys', () => {
    assert.equal(LOJISTA_STORAGE_KEYS.token, 'voltou_token');
    assert.equal(LOJISTA_STORAGE_KEYS.tenantId, 'voltou_tenant_id');
    assert.equal(LOJISTA_STORAGE_KEYS.storeId, 'voltou_store_id');
    assert.equal(STAFF_STORAGE_KEYS.token, 'voltou_staff_token');
    assert.equal(STAFF_STORAGE_KEYS.tenantId, 'voltou_staff_tenant_id');
    assert.equal(STAFF_STORAGE_KEYS.storeId, 'voltou_staff_store_id');
    assert.notEqual(STAFF_STORAGE_KEYS.token, LOJISTA_STORAGE_KEYS.token);
    assert.notEqual(STAFF_STORAGE_KEYS.tenantId, LOJISTA_STORAGE_KEYS.tenantId);
  });
});

describe('applySessionToStorage', () => {
  it('writing a staff session does not clobber lojista keys', () => {
    const storage = memoryStorage();
    applySessionToStorage(storage, 'lojista', lojistaUser);
    applySessionToStorage(storage, 'staff', staffUser);

    const snap = storage.snapshot();
    assert.equal(snap.voltou_token, 'lojista-jwt');
    assert.equal(snap.voltou_tenant_id, 't-loja');
    assert.equal(snap.voltou_store_id, 's-loja');
    assert.equal(snap.voltou_staff_token, 'staff-jwt');
    assert.equal(snap.voltou_staff_tenant_id, 't-staff');
    assert.equal(snap.voltou_staff_store_id, undefined);
  });

  it('writing a lojista session does not clobber staff keys', () => {
    const storage = memoryStorage();
    applySessionToStorage(storage, 'staff', staffUser);
    applySessionToStorage(storage, 'lojista', lojistaUser);

    const snap = storage.snapshot();
    assert.equal(snap.voltou_staff_token, 'staff-jwt');
    assert.equal(snap.voltou_token, 'lojista-jwt');
  });
});

describe('clearSessionFromStorage', () => {
  it('clearing staff leaves the lojista session intact and vice versa', () => {
    const storage = memoryStorage();
    applySessionToStorage(storage, 'lojista', lojistaUser);
    applySessionToStorage(storage, 'staff', staffUser);

    clearSessionFromStorage(storage, 'staff');
    assert.equal(storage.getItem('voltou_staff_token'), null);
    assert.equal(storage.getItem('voltou_token'), 'lojista-jwt');

    applySessionToStorage(storage, 'staff', staffUser);
    clearSessionFromStorage(storage, 'lojista');
    assert.equal(storage.getItem('voltou_token'), null);
    assert.equal(storage.getItem('voltou_staff_token'), 'staff-jwt');
  });
});

describe('sessionKindFromPath', () => {
  it('uses the staff keys only under /equipe', () => {
    assert.equal(sessionKindFromPath('/equipe'), 'staff');
    assert.equal(sessionKindFromPath('/equipe/entrar'), 'staff');
    assert.equal(sessionKindFromPath('/equipe/lojas/abc'), 'staff');
    assert.equal(sessionKindFromPath('/entrar'), 'lojista');
    assert.equal(sessionKindFromPath('/painel'), 'lojista');
    assert.equal(sessionKindFromPath('/painel/clientes'), 'lojista');
  });
});

describe('cookie isolation in session routes', () => {
  it('staff cookie is a different name with Path=/equipe', () => {
    const cookie = readFileSync(
      new URL('./session-cookie.ts', import.meta.url),
      'utf8',
    );
    assert.match(cookie, /export const SESSION_COOKIE = 'voltou_session'/);
    assert.match(
      cookie,
      /export const STAFF_SESSION_COOKIE = 'voltou_staff_session'/,
    );
    assert.match(
      cookie,
      /export const STAFF_SESSION_COOKIE_PATH = '\/equipe'/,
    );

    const staffRoute = readFileSync(
      new URL('../app/api/auth/staff-session/route.ts', import.meta.url),
      'utf8',
    );
    assert.match(staffRoute, /STAFF_SESSION_COOKIE/);
    assert.match(staffRoute, /STAFF_SESSION_COOKIE_PATH/);
    assert.doesNotMatch(staffRoute, /path:\s*'\/'/);

    const lojistaRoute = readFileSync(
      new URL('../app/api/auth/session/route.ts', import.meta.url),
      'utf8',
    );
    assert.match(lojistaRoute, /SESSION_COOKIE/);
    assert.doesNotMatch(lojistaRoute, /STAFF_SESSION_COOKIE/);
  });
});
