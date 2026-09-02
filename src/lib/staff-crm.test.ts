import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ApiHttpError, apiErrorFromBody, isStaffForbiddenError } from './api-error.ts';
import { readJwtRole } from './jwt-role.ts';
import {
  LOJISTA_SESSION_MESSAGE,
  OWNER_ON_STAFF_LOGIN_MESSAGE,
  PUBLIC_OFFER_ORIGIN,
  STAFF_LOGIN_PATH,
  STAFF_ON_LOJISTA_LOGIN_MESSAGE,
  customersInStore,
  equipeAuthRedirect,
  filterStaffStores,
  formatStaffLastContacted,
  homePathForRole,
  lojistaLoginOutcome,
  parseReaisToCents,
  resolveStaffStoreSlug,
  staffLoginOutcome,
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

describe('login path isolation', () => {
  it('keeps staff login on /equipe/entrar, not /entrar', () => {
    assert.equal(STAFF_LOGIN_PATH, '/equipe/entrar');
  });

  it('does not persist a staff login on the lojista form', () => {
    const staff = lojistaLoginOutcome('staff');
    assert.equal(staff.action, 'reject');
    if (staff.action !== 'reject') return;
    assert.equal(staff.href, STAFF_LOGIN_PATH);
    assert.match(staff.message, /área é da loja/i);
    assert.match(staff.message, /\/equipe\/entrar/);
    assert.equal(STAFF_ON_LOJISTA_LOGIN_MESSAGE, staff.message);

    const owner = lojistaLoginOutcome('owner');
    assert.deepEqual(owner, { action: 'persist', session: 'lojista', href: '/painel' });
  });

  it('does not persist an owner login on the staff form', () => {
    const owner = staffLoginOutcome('owner');
    assert.equal(owner.action, 'reject');
    if (owner.action !== 'reject') return;
    assert.match(owner.message, /equipe Voltou/i);
    assert.equal(OWNER_ON_STAFF_LOGIN_MESSAGE, owner.message);
    assert.equal('href' in owner && owner.href, false);

    const staff = staffLoginOutcome('staff');
    assert.deepEqual(staff, { action: 'persist', session: 'staff', href: '/equipe' });
  });
});

describe('equipeAuthRedirect', () => {
  it('sends unauthenticated /equipe traffic to /equipe/entrar, not /entrar', () => {
    assert.equal(equipeAuthRedirect('/equipe', undefined), '/equipe/entrar');
    assert.equal(equipeAuthRedirect('/equipe/lojas/s1', undefined), '/equipe/entrar');
    assert.equal(equipeAuthRedirect('/equipe/entrar', undefined), null);
    assert.equal(equipeAuthRedirect('/equipe', 'staff-cookie'), null);
    assert.equal(equipeAuthRedirect('/painel', undefined), null);
  });
});

describe('customersInStore', () => {
  it('keeps only the selected store slice', () => {
    const rows = [
      { id: 'c1', storeId: 's1' },
      { id: 'c2', storeId: 's2' },
      { id: 'c3', storeId: 's1' },
    ];
    assert.deepEqual(
      customersInStore(rows, 's1').map((c) => c.id),
      ['c1', 'c3'],
    );
  });
});

describe('filterStaffStores', () => {
  it('matches store or tenant name', () => {
    const stores = [
      { id: 's1', name: 'Sapataria', tenant: { name: 'Carlos' } },
      { id: 's2', name: 'Ateliê', tenant: { name: 'Luna' } },
    ];
    assert.equal(filterStaffStores(stores, 'luna').map((s) => s.id).join(), 's2');
    assert.equal(filterStaffStores(stores, '').length, 2);
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
    assert.equal(
      storeDisplayName({
        name: 'Sapataria',
        tenant: { name: 'Carlos' },
      }),
      'Sapataria · Carlos',
    );
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

  it('prefers GET /staff/stores/:storeId/customers with a flat-list fallback', () => {
    assert.match(api, /export async function listStaffStoreCustomers/);
    const start = api.indexOf('export async function listStaffStoreCustomers');
    assert.ok(start >= 0, 'listStaffStoreCustomers must exist');
    const rest = api.slice(start);
    const nextExport = rest.indexOf('\nexport ', 1);
    const body = nextExport === -1 ? rest : rest.slice(0, nextExport);
    assert.match(body, /\/staff\/stores\/\$\{/);
    assert.match(body, /\/customers/);
    assert.match(body, /listStaffCustomers/);
    assert.match(body, /usedFlatListFallback/);
  });

  it('lojista /entrar does not persist a staff session', () => {
    const form = readFileSync(
      new URL('../components/auth/auth-form.tsx', import.meta.url),
      'utf8',
    );
    assert.match(form, /lojistaLoginOutcome/);
    assert.doesNotMatch(form, /persistStaffSession/);
    assert.match(form, /STAFF_LOGIN_PATH|\/equipe\/entrar/);
  });

  it('staff /equipe/entrar has no criar conta and persists only staff', () => {
    const page = readFileSync(
      new URL('../app/equipe/entrar/page.tsx', import.meta.url),
      'utf8',
    );
    const form = readFileSync(
      new URL('../components/auth/staff-login-form.tsx', import.meta.url),
      'utf8',
    );
    assert.doesNotMatch(page, /criar conta/i);
    assert.doesNotMatch(form, /criar conta/i);
    assert.doesNotMatch(form, /registerAccount/);
    assert.match(form, /staffLoginOutcome/);
    assert.match(form, /persistStaffSession/);
    assert.doesNotMatch(form, /persistClientSession/);
  });

  it('equipe home lists stores, not a flat customer list', () => {
    const page = readFileSync(
      new URL('../app/equipe/(crm)/page.tsx', import.meta.url),
      'utf8',
    );
    const authMe = page.indexOf('fetchAuthMe');
    const stores = page.indexOf('listStaffStores');
    assert.ok(authMe >= 0, 'equipe home must call fetchAuthMe');
    assert.ok(stores >= 0, 'equipe home must call listStaffStores');
    assert.ok(authMe < stores, 'must resolve role before GET /staff/stores');
    assert.match(page, /isStaffRole\(user\.role\)/);
    assert.equal(page.includes('listStaffCustomers'), false);
    assert.match(page, /\/equipe\/lojas\//);
  });

  it('store CRM page loads that store\'s customers and keeps contact + emit link', () => {
    const page = [
      readFileSync(
        new URL('../app/equipe/(crm)/lojas/[storeId]/page.tsx', import.meta.url),
        'utf8',
      ),
      readFileSync(
        new URL(
          '../components/equipe/staff-customers-panel.tsx',
          import.meta.url,
        ),
        'utf8',
      ),
    ].join('\n');
    assert.match(page, /listStaffStoreCustomers/);
    assert.match(page, /registerStaffContact/);
    assert.match(page, /createStaffCheckout/);
    assert.match(page, /tenantId/);
    assert.match(page, /storeId/);
  });

  it('painel never imports the staff checkout helper', () => {
    const painel = [
      readFileSync(new URL('../app/painel/page.tsx', import.meta.url), 'utf8'),
      readFileSync(
        new URL('../app/painel/clientes/page.tsx', import.meta.url),
        'utf8',
      ),
      readFileSync(
        new URL('../components/painel/painel-nav.tsx', import.meta.url),
        'utf8',
      ),
    ].join('\n');
    assert.equal(painel.includes('createStaffCheckout'), false);
    assert.equal(painel.includes('/staff/customers'), false);
  });

  it('middleware guards /equipe with the staff cookie only', () => {
    const mw = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8');
    assert.match(mw, /STAFF_SESSION_COOKIE/);
    assert.match(mw, /equipeAuthRedirect/);
    assert.match(mw, /isStaffRole/);
    assert.match(mw, /SESSION_COOKIE/);
  });
});
