import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  lojistaApiLoadError,
  lojistaDemoBannerVisible,
  merchantVisibleFunnelSteps,
} from './lojista-panel-ux.ts';

const dashboard = readFileSync(
  new URL('../app/painel/page.tsx', import.meta.url),
  'utf8',
);
const clientes = readFileSync(
  new URL('../app/painel/clientes/page.tsx', import.meta.url),
  'utf8',
);
const produtos = readFileSync(
  new URL('../app/painel/produtos/page.tsx', import.meta.url),
  'utf8',
);
const regras = readFileSync(
  new URL('../app/painel/regras/page.tsx', import.meta.url),
  'utf8',
);
const fulfillment = readFileSync(
  new URL('../components/painel/fulfillment-settings-card.tsx', import.meta.url),
  'utf8',
);
const nav = readFileSync(
  new URL('../components/painel/painel-nav.tsx', import.meta.url),
  'utf8',
);
const policy = readFileSync(
  new URL('./lojista-panel-policy.ts', import.meta.url),
  'utf8',
);

describe('no demo banner when a session token is present', () => {
  it('hides demo copy whenever an access token exists', () => {
    assert.equal(lojistaDemoBannerVisible({ accessToken: 'jwt-token' }), false);
    assert.equal(lojistaDemoBannerVisible({ accessToken: '  jwt  ' }), false);
    assert.equal(lojistaDemoBannerVisible({ accessToken: null }), false);
    assert.equal(lojistaDemoBannerVisible({ accessToken: '' }), false);
  });

  it('Clientes and Produtos never mix demo banner with a logged-in session', () => {
    for (const [name, src] of [
      ['clientes', clientes],
      ['produtos', produtos],
    ] as const) {
      assert.equal(
        src.includes('lojistaDemoBannerVisible'),
        true,
        `${name} must gate demo copy`,
      );
      assert.equal(
        src.includes('!usingApi && !tenantCtx'),
        false,
        `${name} must not flash demo copy before tenant resolves`,
      );
      assert.equal(
        src.includes('dados de demonstração'),
        false,
        `${name} must not tell a logged-in lojista they are seeing demo data`,
      );
      assert.equal(
        /mostrando (dados de )?demonstra/i.test(src),
        false,
        `${name} API error must not fall back to demo copy`,
      );
    }
  });

  it('uses a generic load error, not demo mix-in copy', () => {
    assert.match(lojistaApiLoadError(), /n[aã]o foi poss[ií]vel carregar/i);
    assert.equal(/demonstra/i.test(lojistaApiLoadError()), false);
    assert.equal(clientes.includes('lojistaApiLoadError'), true);
    assert.equal(produtos.includes('lojistaApiLoadError'), true);
    assert.equal(dashboard.includes('lojistaApiLoadError'), true);
  });

  it('does not mix mock lists into Clientes/Produtos on API error', () => {
    assert.equal(clientes.includes('apiClientes ?? listCustomers()'), false);
    assert.equal(produtos.includes('useState<Produto[]>(PRODUTOS_INICIAIS)'), false);
    assert.equal(produtos.includes('PRODUTOS_INICIAIS'), false);
  });
});

describe('dashboard never renders fake 23740 / 183 totals', () => {
  it('does not fall back to mock product performance for a logged-in session', () => {
    assert.equal(dashboard.includes('getProductPerformance'), false);
    assert.equal(dashboard.includes('MOCK_PRODUCTS'), false);
    assert.equal(/· demonstração/.test(dashboard), false);
    assert.equal(
      /animate-pulse|skeleton/i.test(dashboard),
      true,
      'dashboard must show a skeleton while metrics load',
    );
  });

  it('does not hardcode the demo KPI totals', () => {
    assert.equal(dashboard.includes('23740'), false);
    assert.equal(dashboard.includes('23.740'), false);
    assert.equal(dashboard.includes('23.740,00'), false);
    const mockDash = readFileSync(
      new URL('./mock-dashboard.ts', import.meta.url),
      'utf8',
    );
    assert.match(mockDash, /623000/);
    assert.equal(
      dashboard.includes('getProductPerformance'),
      false,
      'logged-in dashboard must not render mock-dashboard rows (R$ 23.740 / 183 vendas)',
    );
  });
});

describe('campaign queue is not in the lojista nav or dashboard', () => {
  it('keeps campanhas out of first-class nav', () => {
    assert.equal(nav.includes('/painel/campanhas'), false);
    assert.equal(/campanhas/i.test(nav), false);
  });

  it('does not show a campaign queue on the merchant dashboard', () => {
    for (const needle of [
      'Fila de campanhas',
      'Fila de aprovação',
      'Fila de envio',
      'listCampaigns',
      'listOutreachMessages',
      'Prontos para recuperar',
      'Prontos pra disparar',
    ]) {
      assert.equal(
        dashboard.includes(needle),
        false,
        `dashboard still exposes campaign-queue UI: ${needle}`,
      );
    }
    assert.equal(policy.includes('Fila de campanhas'), true);
  });

  it('hides unused funnel Contatados so 0 cannot contradict checkouts', () => {
    const withCheckouts = merchantVisibleFunnelSteps({
      contacted: 0,
      interested: 2,
      checkoutsSent: 7,
      checkoutsPaid: 3,
    });
    assert.equal(
      withCheckouts.some((s) => s.label === 'Contatados'),
      false,
    );
    assert.deepEqual(
      withCheckouts.map((s) => s.label),
      ['Interessados', 'Checkouts', 'Pagos'],
    );
    assert.equal(
      withCheckouts.find((s) => s.label === 'Checkouts')?.value,
      7,
    );
    assert.equal(dashboard.includes('merchantVisibleFunnelSteps'), true);
    assert.equal(dashboard.includes("label: 'Contatados'"), false);
  });
});

describe('Regras has a single Salvar and pickup stays required', () => {
  it('exposes one Salvar for rules + fulfillment, not two', () => {
    assert.equal(fulfillment.includes('Salvar entrega e pedidos'), false);
    assert.equal(regras.includes('Salvar regras'), false);
    assert.equal(
      regras.includes("{saving ? 'Salvando…' : 'Salvar'}"),
      true,
    );
    assert.equal(
      fulfillment.includes('type="submit"'),
      false,
      'Entrega e pedidos must not have its own submit button',
    );
    const salvarLabels = [
      ...regras.matchAll(/>Salvar[^<]*/g),
      ...fulfillment.matchAll(/>Salvar[^<]*/g),
    ].map((m) => m[0]);
    assert.equal(
      salvarLabels.length,
      0,
      `literal Salvar labels should live in the sticky ternary, got ${salvarLabels.join(', ')}`,
    );
    assert.equal(
      /fulfillmentRef|saveFulfillment/.test(regras),
      true,
      'single Salvar must also persist Entrega e pedidos',
    );
  });

  it('keeps Entrega e pedidos on Regras with required pickup and national WA mask', () => {
    assert.match(regras, /FulfillmentSettingsCard/);
    assert.equal(regras.includes('updateFulfillmentSettings'), false);
    assert.match(fulfillment, /validateFulfillmentMerchantForm/);
    assert.match(fulfillment, /Informe o endereço de retirada|pickupAddressText/);
    assert.equal(fulfillment.includes('+55'), false);
    assert.match(fulfillment, /required/);
  });
});
