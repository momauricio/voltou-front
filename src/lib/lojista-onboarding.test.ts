import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  evaluateOnboarding,
  ONBOARDING_HOME_SUBTITLE,
  ONBOARDING_STEP_IDS,
  onboardingEmptyState,
  PRIMEIRO_CLIENTE_CTA,
  PRIMEIRO_CLIENTE_HREF,
  PRIMEIRO_CLIENTE_SENTENCE,
  PRIMEIRO_PRODUTO_CTA,
  PRIMEIRO_PRODUTO_HREF,
  shouldShowFullDashboard,
  type OnboardingFacts,
} from './lojista-onboarding.ts';

const emptyFacts: OnboardingFacts = {
  customerCount: 0,
  productCount: 0,
  mercadoPagoConnected: false,
  pickupAddressText: '',
  orderNotifyPhoneE164: '',
};

const wizard = readFileSync(
  new URL('../components/painel/onboarding-wizard.tsx', import.meta.url),
  'utf8',
);
const emptyState = readFileSync(
  new URL('../components/painel/onboarding-empty-state.tsx', import.meta.url),
  'utf8',
);
const dashboard = readFileSync(
  new URL('../app/painel/page.tsx', import.meta.url),
  'utf8',
);
const layout = readFileSync(
  new URL('../app/painel/layout.tsx', import.meta.url),
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
const pedidos = readFileSync(
  new URL('../app/painel/pedidos/page.tsx', import.meta.url),
  'utf8',
);
const regras = readFileSync(
  new URL('../app/painel/regras/page.tsx', import.meta.url),
  'utf8',
);
const perfil = readFileSync(
  new URL('../app/painel/perfil/page.tsx', import.meta.url),
  'utf8',
);
const payment = readFileSync(
  new URL('../components/painel/payment-providers-card.tsx', import.meta.url),
  'utf8',
);

function assertNoForbiddenCopy(src: string, label: string) {
  assert.equal(/puxar/i.test(src), false, `${label} must not say puxar`);
  assert.equal(/instagram/i.test(src), false, `${label} must not mention Instagram`);
  assert.equal(/\bVIP\b/.test(src), false, `${label} must not use VIP jargon`);
  assert.equal(/fila de campanhas/i.test(src), false, `${label} must not show campaign queue`);
}

describe('VOL-29 onboarding helper', () => {
  it('locks exactly 3 steps in product order: cliente → produto → loja pronta', () => {
    assert.deepEqual([...ONBOARDING_STEP_IDS], [
      'primeiro-cliente',
      'primeiro-produto',
      'loja-pronta',
    ]);
    const snap = evaluateOnboarding(emptyFacts);
    assert.deepEqual(
      snap.steps.map((s) => s.id),
      ['primeiro-cliente', 'primeiro-produto', 'loja-pronta'],
    );
    assert.equal(snap.steps.length, 3);
    assert.equal(snap.completedCount, 0);
    assert.equal(snap.next?.id, 'primeiro-cliente');
    assert.equal(snap.next?.sentence, PRIMEIRO_CLIENTE_SENTENCE);
    assert.equal(snap.next?.cta, PRIMEIRO_CLIENTE_CTA);
    assert.equal(snap.next?.href, PRIMEIRO_CLIENTE_HREF);
  });

  it('keeps the 1º cliente as the next step even if product or MP is already done', () => {
    const snap = evaluateOnboarding({
      ...emptyFacts,
      productCount: 4,
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua A, 1',
      orderNotifyPhoneE164: '+5511987654321',
    });
    assert.equal(snap.hasFirstClient, false);
    assert.equal(snap.steps[1]?.done, true);
    assert.equal(snap.steps[2]?.done, true);
    assert.equal(snap.next?.id, 'primeiro-cliente');
    assert.equal(shouldShowFullDashboard(snap), false);
  });

  it('unlocks the full dashboard as soon as the 1st client exists', () => {
    const snap = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
    });
    assert.equal(snap.hasFirstClient, true);
    assert.equal(snap.allDone, false);
    assert.equal(snap.next?.id, 'primeiro-produto');
    assert.equal(snap.next?.cta, PRIMEIRO_PRODUTO_CTA);
    assert.equal(snap.next?.href, PRIMEIRO_PRODUTO_HREF);
    assert.equal(shouldShowFullDashboard(snap), true);
  });

  it('marks loja pronta only when MP + retirada + aviso de pedido are all set', () => {
    const almost = evaluateOnboarding({
      customerCount: 1,
      productCount: 1,
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua Exemplo, 100',
      orderNotifyPhoneE164: '',
    });
    assert.equal(almost.steps[2]?.done, false);
    assert.equal(almost.next?.id, 'loja-pronta');
    assert.match(almost.next?.cta ?? '', /WhatsApp de aviso/i);
    assert.match(almost.next?.href ?? '', /fulfillmentNotifyPhone/);

    const ready = evaluateOnboarding({
      customerCount: 1,
      productCount: 1,
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua Exemplo, 100',
      orderNotifyPhoneE164: '+5511987654321',
    });
    assert.equal(ready.allDone, true);
    assert.equal(ready.next, null);
    assert.equal(shouldShowFullDashboard(ready), true);
    assert.equal(onboardingEmptyState(ready), null);
  });

  it('points loja-pronta CTA at the first missing piece, never store WhatsApp', () => {
    const mp = evaluateOnboarding({ ...emptyFacts, customerCount: 1, productCount: 1 });
    assert.match(mp.next?.href ?? '', /#mercadopago/);
    assert.match(mp.next?.cta ?? '', /Mercado Pago/);

    const pickup = evaluateOnboarding({
      customerCount: 1,
      productCount: 1,
      mercadoPagoConnected: true,
      pickupAddressText: '   ',
      orderNotifyPhoneE164: '+5511987654321',
    });
    assert.match(pickup.next?.href ?? '', /fulfillmentPickup/);

    const helper = readFileSync(new URL('./lojista-onboarding.ts', import.meta.url), 'utf8');
    assert.equal(helper.includes('listWhatsappConnections'), false);
    assert.equal(helper.includes('uiStatus'), false);
    assert.doesNotMatch(helper, /listWhatsappConnections/);
  });

  it('empty state is one sentence + one CTA for the next incomplete step', () => {
    const empty = onboardingEmptyState(evaluateOnboarding(emptyFacts));
    assert.deepEqual(empty, {
      sentence: PRIMEIRO_CLIENTE_SENTENCE,
      cta: PRIMEIRO_CLIENTE_CTA,
      href: PRIMEIRO_CLIENTE_HREF,
    });
    assert.match(ONBOARDING_HOME_SUBTITLE, /2ª venda a Voltou faz por você/);
    assert.equal(/VIP/i.test(ONBOARDING_HOME_SUBTITLE), false);
    assert.equal(/puxar/i.test(ONBOARDING_HOME_SUBTITLE), false);
  });
});

describe('VOL-29 onboarding wiring (source)', () => {
  it('renders the 3-task home on the dashboard and not as a layout duplicate', () => {
    assert.match(dashboard, /OnboardingWizard|OnboardingHome/);
    assert.match(dashboard, /shouldShowFullDashboard/);
    assert.match(dashboard, /evaluateOnboarding|useOnboardingSnapshot/);
    assert.equal(layout.includes('OnboardingWizard'), false);
    assert.match(wizard, /primeiro-cliente|step\.cta|nextStep/);
    assert.match(wizard, /ONBOARDING_HOME_TITLE|ONBOARDING_HOME_SUBTITLE/);
    assert.equal(wizard.includes('Trazer quem já compra'), false);
    assert.equal(wizard.includes('Conectar o WhatsApp da loja'), false);
    assert.equal(wizard.includes('listWhatsappConnections'), false);
    assert.equal(wizard.includes('voltou_onboarding_dismissed'), false);
  });

  it('gates filters, funnel and PDF until the 1st client or 3/3', () => {
    assert.match(dashboard, /shouldShowFullDashboard/);
    assert.match(dashboard, /Exportar PDF/);
    assert.match(dashboard, /merchantVisibleFunnelSteps/);
    assert.equal(dashboard.includes('listCampaigns'), false);
    assert.equal(dashboard.includes('Fila de campanhas'), false);
    assert.equal(dashboard.includes('Mercado Pago → base → regras'), false);
  });

  it('empty states on Clientes, Produtos, Pedidos and Regras use the next step helper', () => {
    for (const [name, src] of [
      ['empty-state', emptyState],
      ['clientes', clientes],
      ['produtos', produtos],
      ['pedidos', pedidos],
      ['regras', regras],
    ] as const) {
      assert.match(
        src,
        /OnboardingEmptyState|onboardingEmptyState/,
        `${name} must use the onboarding empty state`,
      );
    }
    assert.match(clientes, /get\('novo'\)/);
    assert.match(produtos, /get\('novo'\)/);
    assert.match(
      readFileSync(new URL('./lojista-onboarding.ts', import.meta.url), 'utf8'),
      /clientes\?novo=1/,
    );
    assert.match(
      readFileSync(new URL('./lojista-onboarding.ts', import.meta.url), 'utf8'),
      /produtos\?novo=1/,
    );
    assert.equal(clientes.includes('Importar planilha do PDV'), false);
    assert.equal(produtos.includes('Importar catálogo'), false);
  });

  it('keeps store WhatsApp optional on Perfil and MP hash for step 3', () => {
    assert.match(perfil, /Opcional|WhatsappConnectCard/);
    assert.match(payment, /id="mercadopago"/);
    assert.doesNotMatch(wizard, /orderNotifyPhoneE164.*whatsapp/i);
  });

  it('uses didactic 2ª-venda copy without puxar, Instagram, VIP or campaign queue', () => {
    for (const [name, src] of [
      ['wizard', wizard],
      ['empty-state', emptyState],
      ['dashboard', dashboard],
      ['clientes', clientes],
      ['produtos', produtos],
      ['pedidos', pedidos],
      ['regras', regras],
    ] as const) {
      assertNoForbiddenCopy(src, name);
    }
  });
});
