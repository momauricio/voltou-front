import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ApiHttpError, apiErrorFromBody, isStaffForbiddenError } from './api-error.ts';
import { readJwtRole } from './jwt-role.ts';
import {
  LOJISTA_SESSION_MESSAGE,
  PUBLIC_OFFER_ORIGIN,
  formatStaffLastContacted,
  homePathForRole,
  parseReaisToCents,
  resolveStaffStoreSlug,
  staffCheckoutPublicUrl,
  staffCustomerPhone,
  storeDisplayName,
} from './staff-crm.ts';

function fakeJwt(payload: Record<string, unknown>) {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `eyJhbGciOiJub25lIn0.${json}.sig`;
}

describe('homePathForRole', () => {
  it('sends staff to /equipe and everyone else to /painel', () => {
    assert.equal(homePathForRole('staff'), '/equipe');
    assert.equal(homePathForRole('owner'), '/painel');
    assert.equal(homePathForRole(undefined), '/painel');
    assert.equal(homePathForRole(null), '/painel');
  });
});

describe('formatStaffLastContacted', () => {
  it('uses “ainda não” when staff has not contacted the customer', () => {
    assert.equal(formatStaffLastContacted(null), 'ainda não');
    assert.equal(formatStaffLastContacted(undefined), 'ainda não');
    assert.equal(formatStaffLastContacted(''), 'ainda não');
  });

  it('formats lastContactedAt as “contatado em …” in pt-BR', () => {
    assert.equal(
      formatStaffLastContacted('2026-08-31T18:00:00.000Z'),
      'contatado em 31/08/2026',
    );
  });
});

describe('staffCheckoutPublicUrl', () => {
  it('builds https://www.voltouapp.com/loja/{slug}/{coupon}', () => {
    assert.equal(PUBLIC_OFFER_ORIGIN, 'https://www.voltouapp.com');
    assert.equal(
      staffCheckoutPublicUrl({
        storeSlug: 'sapataria-carlos',
        couponCode: 'VOLTOU-ABC',
      }),
      'https://www.voltouapp.com/loja/sapataria-carlos/VOLTOU-ABC',
    );
  });

  it('falls back to paymentUrl when slug or coupon is missing', () => {
    assert.equal(
      staffCheckoutPublicUrl({
        storeSlug: null,
        couponCode: 'X',
        paymentUrl: 'https://www.voltouapp.com/p/token',
      }),
      'https://www.voltouapp.com/p/token',
    );
    assert.equal(
      staffCheckoutPublicUrl({ storeSlug: 'loja', couponCode: null }),
      null,
    );
  });
});

describe('resolveStaffStoreSlug', () => {
  it('prefers slug on the customer store payload', () => {
    assert.equal(
      resolveStaffStoreSlug(
        { storeId: 's1', store: { id: 's1', slug: 'principal' } },
        [{ id: 's1', slug: 'other' }],
      ),
      'principal',
    );
  });

  it('falls back to GET /staff/stores when the customer has no slug', () => {
    assert.equal(
      resolveStaffStoreSlug({ storeId: 's2', store: { id: 's2', slug: null } }, [
        { id: 's1', slug: 'a' },
        { id: 's2', slug: 'loja-b' },
      ]),
      'loja-b',
    );
  });
});

describe('staff copy helpers', () => {
  it('shows store/tenant name and phone without dumping empty values', () => {
    assert.equal(
      storeDisplayName({
        store: { name: 'Sapataria do Carlos' },
        tenant: { name: 'Sapataria do Carlos' },
      }),
      'Sapataria do Carlos',
    );
    assert.equal(
      storeDisplayName({
        store: { name: 'Principal' },
        tenant: { name: 'Ateliê Luna' },
      }),
      'Principal · Ateliê Luna',
    );
    assert.equal(staffCustomerPhone({ phoneE164: '+5511999990001', phoneMasked: '(11) *****-0001' }), '+55 11 99999-0001');
    assert.equal(staffCustomerPhone({ phoneE164: null, phoneMasked: '(11) *****-0001' }), '(11) *****-0001');
    assert.equal(staffCustomerPhone({ phoneE164: null, phoneMasked: null }), '—');
  });

  it('parses Brazilian reais into cents for the checkout amount', () => {
    assert.equal(parseReaisToCents('199,90'), 19990);
    assert.equal(parseReaisToCents('199.90'), 19990);
    assert.equal(parseReaisToCents('1.234,56'), 123456);
    assert.equal(parseReaisToCents(''), null);
    assert.equal(parseReaisToCents('0'), null);
  });

  it('explains a 403 as sessão de lojista without raw API text', () => {
    assert.match(LOJISTA_SESSION_MESSAGE, /sessão de lojista/i);
    assert.doesNotMatch(LOJISTA_SESSION_MESSAGE, /puxar/i);
    assert.doesNotMatch(LOJISTA_SESSION_MESSAGE, /Forbidden/i);
    const err = apiErrorFromBody(403, { message: 'Forbidden resource' });
    assert.equal(isStaffForbiddenError(err), true);
    assert.equal(isStaffForbiddenError(apiErrorFromBody(401, { message: 'Unauthorized' })), false);
    assert.ok(err instanceof ApiHttpError);
    assert.ok(err instanceof Error);
    assert.equal(err.status, 403);
  });
});

describe('readJwtRole', () => {
  it('reads role from a JWT payload so middleware can route staff vs owner', () => {
    assert.equal(readJwtRole(fakeJwt({ role: 'staff' })), 'staff');
    assert.equal(readJwtRole(fakeJwt({ role: 'owner' })), 'owner');
    assert.equal(readJwtRole(fakeJwt({ sub: 'user-1' })), undefined);
    assert.equal(readJwtRole('not-a-jwt'), undefined);
  });
});

describe('staff API client contract', () => {
  const api = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');

  it('login and /auth/me types include role', () => {
    assert.match(api, /role\?:\s*'staff'\s*\|\s*'owner'/);
    assert.match(api, /export async function listStaffCustomers/);
    assert.match(api, /export async function listStaffStores/);
    assert.match(api, /export async function registerStaffContact/);
    assert.match(api, /export async function createStaffCheckout/);
  });

  it('staff checkout posts to /checkouts without the lojista dispatch lock', () => {
    const start = api.indexOf('export async function createStaffCheckout');
    assert.ok(start >= 0, 'createStaffCheckout must exist');
    const rest = api.slice(start);
    const nextExport = rest.indexOf('\nexport ', 1);
    const body = nextExport === -1 ? rest : rest.slice(0, nextExport);
    assert.equal(body.includes('assertLojistaCannotDispatch'), false);
    assert.match(body, /\/checkouts/);
  });

  it('createApiCheckout stays locked so the lojista panel cannot emit links', () => {
    const start = api.indexOf('export async function createApiCheckout');
    const rest = api.slice(start);
    const nextExport = rest.indexOf('\nexport ', 1);
    const body = nextExport === -1 ? rest : rest.slice(0, nextExport);
    assert.match(body, /assertLojistaCannotDispatch/);
  });

  it('login sends staff to /equipe by role', () => {
    const form = readFileSync(
      new URL('../components/auth/auth-form.tsx', import.meta.url),
      'utf8',
    );
    assert.match(form, /homePathForRole\(result\.user\.role\)/);
  });
});
