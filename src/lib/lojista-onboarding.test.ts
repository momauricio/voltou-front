import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  CLIENTE_CTA,
  CLIENTE_HREF,
  CLIENTE_SENTENCE,
  MERCADO_PAGO_CTA,
  MERCADO_PAGO_HREF,
  MERCADO_PAGO_SENTENCE,
  ONBOARDING_CHECKLIST_LABEL,
  ONBOARDING_MOTHER_LINE_1,
  ONBOARDING_MOTHER_LINE_2,
  ONBOARDING_STEP_IDS,
  PRODUTO_CTA,
  PRODUTO_HREF,
  PRODUTO_SENTENCE,
  REGRAS_CTA,
  REGRAS_HREF,
  REGRAS_SENTENCE,
  RETIRADA_CTA,
  RETIRADA_HREF,
  RETIRADA_SENTENCE,
  evaluateOnboarding,
  onboardingEmptyState,
  onboardingEmptyStateFor,
  progressLabel,
  shouldShowFullDashboard,
  type OnboardingFacts,
} from './lojista-onboarding.ts';

const emptyFacts: OnboardingFacts = {
  customerCount: 0,
  productCount: 0,
  rulesUpdatedAt: null,
  descontoPadrao: '',
  margemMaxima: '',
  maxDescontoUmProduto: '',
  maxDescontoDoisOuMais: '',
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
const helper = readFileSync(new URL('./lojista-onboarding.ts', import.meta.url), 'utf8');
const snapshotHook = readFileSync(
  new URL('../components/painel/use-onboarding-snapshot.ts', import.meta.url),
  'utf8',
);

function assertNoForbiddenCopy(src: string, label: string) {
  assert.equal(/puxar/i.test(src), false, `${label} must not say puxar`);
  assert.equal(/instagram/i.test(src), false, `${label} must not mention Instagram`);
  assert.equal(/\bVIP\b/.test(src), false, `${label} must not use VIP jargon`);
  assert.equal(/fila de campanhas/i.test(src), false, `${label} must not show campaign queue`);
}

describe('onboarding v2 evaluate helpers', () => {
  it('locks exactly 5 steps in hard order: cliente → produto → regras → MP → retirada', () => {
    assert.deepEqual([...ONBOARDING_STEP_IDS], [
      'primeiro-cliente',
      'primeiro-produto',
      'regras',
      'mercado-pago',
      'retirada',
    ]);
    const snap = evaluateOnboarding(emptyFacts);
    assert.deepEqual(
      snap.steps.map((s) => s.id),
      [
        'primeiro-cliente',
        'primeiro-produto',
        'regras',
        'mercado-pago',
        'retirada',
      ],
    );
    assert.equal(snap.steps.length, 5);
    assert.equal(snap.completedCount, 0);
    assert.equal(progressLabel(snap), '0 de 5 prontos');
    assert.equal(snap.next?.id, 'primeiro-cliente');
    assert.equal(snap.next?.sentence, CLIENTE_SENTENCE);
    assert.equal(snap.next?.cta, CLIENTE_CTA);
    assert.equal(snap.next?.href, CLIENTE_HREF);
  });

  it('uses locked empty-state copy for every step', () => {
    assert.equal(
      CLIENTE_SENTENCE,
      'Cadastre o 1º cliente — nome e número de quem comprou ou teve interesse.',
    );
    assert.equal(CLIENTE_CTA, 'Cadastrar cliente');
    assert.equal(
      PRODUTO_SENTENCE,
      'Cadastre 1 produto que já está na arara.',
    );
    assert.equal(PRODUTO_CTA, 'Cadastrar produto');
    assert.equal(
      REGRAS_SENTENCE,
      'Defina o teto de desconto da loja — a Voltou usa isso na 2ª venda.',
    );
    assert.equal(REGRAS_CTA, 'Definir regras');
    assert.equal(
      MERCADO_PAGO_SENTENCE,
      'Conecte o Mercado Pago pra receber quando a venda fechar.',
    );
    assert.equal(MERCADO_PAGO_CTA, 'Conectar Mercado Pago');
    assert.equal(
      RETIRADA_SENTENCE,
      'Informe o endereço de retirada e o WhatsApp de aviso de pedido.',
    );
    assert.equal(RETIRADA_CTA, 'Cadastrar retirada');
  });

  it('keeps locked mother lines and checklist label constants', () => {
    assert.equal(ONBOARDING_MOTHER_LINE_1, 'A 1ª venda você fez no balcão.');
    assert.equal(ONBOARDING_MOTHER_LINE_2, 'A 2ª venda a Voltou faz por você.');
    assert.equal(ONBOARDING_CHECKLIST_LABEL, 'Deixe a loja pronta');
  });

  it('keeps cliente as next even if later steps are already done', () => {
    const snap = evaluateOnboarding({
      ...emptyFacts,
      productCount: 4,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
      margemMaxima: '20',
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua A, 1',
      orderNotifyPhoneE164: '+5511987654321',
    });
    assert.equal(snap.hasFirstClient, false);
    assert.equal(snap.steps[1]?.done, true);
    assert.equal(snap.steps[2]?.done, true);
    assert.equal(snap.steps[3]?.done, true);
    assert.equal(snap.steps[4]?.done, true);
    assert.equal(snap.next?.id, 'primeiro-cliente');
    assert.equal(shouldShowFullDashboard(snap), false);
    assert.equal(progressLabel(snap), '4 de 5 prontos');
  });

  it('does not unlock the dashboard on the 1st client (hard gate 5/5)', () => {
    const snap = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
    });
    assert.equal(snap.hasFirstClient, true);
    assert.equal(snap.allDone, false);
    assert.equal(snap.next?.id, 'primeiro-produto');
    assert.equal(shouldShowFullDashboard(snap), false);
  });

  it('marks regras only when the lojista saved a discount ceiling', () => {
    const unsavedDefaults = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
      productCount: 1,
      margemMaxima: '20',
      descontoPadrao: '10',
    });
    assert.equal(unsavedDefaults.steps[2]?.done, false);
    assert.equal(unsavedDefaults.next?.id, 'regras');
    assert.equal(unsavedDefaults.next?.href, REGRAS_HREF);

    const savedNoCeiling = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
    });
    assert.equal(savedNoCeiling.steps[2]?.done, false);

    const ready = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
      margemMaxima: '20',
    });
    assert.equal(ready.steps[2]?.done, true);
    assert.equal(ready.next?.id, 'mercado-pago');
  });

  it('splits Mercado Pago and retirada, and never uses store WhatsApp', () => {
    const afterRegras = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
      maxDescontoUmProduto: '10',
    });
    assert.equal(afterRegras.next?.id, 'mercado-pago');
    assert.equal(afterRegras.next?.href, MERCADO_PAGO_HREF);
    assert.equal(afterRegras.next?.cta, MERCADO_PAGO_CTA);

    const afterMp = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
      margemMaxima: '15',
      mercadoPagoConnected: true,
    });
    assert.equal(afterMp.next?.id, 'retirada');
    assert.equal(afterMp.next?.href, RETIRADA_HREF);
    assert.equal(afterMp.next?.cta, RETIRADA_CTA);

    const pickupOnly = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
      margemMaxima: '15',
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua Exemplo, 100',
    });
    assert.equal(pickupOnly.steps[4]?.done, false);
    assert.match(pickupOnly.next?.href ?? '', /fulfillmentNotifyPhone/);

    assert.equal(helper.includes('listWhatsappConnections'), false);
    assert.doesNotMatch(helper, /listWhatsappConnections/);
  });

  it('unlocks the dashboard only at 5/5', () => {
    const almost = evaluateOnboarding({
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
      margemMaxima: '20',
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua Exemplo, 100',
      orderNotifyPhoneE164: '',
    });
    assert.equal(almost.completedCount, 4);
    assert.equal(almost.allDone, false);
    assert.equal(shouldShowFullDashboard(almost), false);

    const ready = evaluateOnboarding({
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-09-09T12:00:00.000Z',
      margemMaxima: '20',
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua Exemplo, 100',
      orderNotifyPhoneE164: '+5511987654321',
    });
    assert.equal(ready.allDone, true);
    assert.equal(ready.next, null);
    assert.equal(shouldShowFullDashboard(ready), true);
    assert.equal(onboardingEmptyState(ready), null);
    assert.equal(progressLabel(ready), '5 de 5 prontos');
  });

  it('empty state helper returns the next incomplete step; page helper returns that item', () => {
    const empty = onboardingEmptyState(evaluateOnboarding(emptyFacts));
    assert.deepEqual(empty, {
      sentence: CLIENTE_SENTENCE,
      cta: CLIENTE_CTA,
      href: CLIENTE_HREF,
    });
    assert.deepEqual(onboardingEmptyStateFor('primeiro-produto'), {
      sentence: PRODUTO_SENTENCE,
      cta: PRODUTO_CTA,
      href: PRODUTO_HREF,
    });
    assert.deepEqual(onboardingEmptyStateFor('regras'), {
      sentence: REGRAS_SENTENCE,
      cta: REGRAS_CTA,
      href: REGRAS_HREF,
    });
  });
});

describe('onboarding v2 wiring (source)', () => {
  it('renders the setup screen on the dashboard and not as a layout duplicate', () => {
    assert.match(dashboard, /OnboardingWizard|OnboardingHome|OnboardingSetup/);
    assert.match(dashboard, /shouldShowFullDashboard/);
    assert.match(dashboard, /evaluateOnboarding|useOnboardingSnapshot/);
    assert.equal(layout.includes('OnboardingWizard'), false);
    assert.match(wizard, /ONBOARDING_MOTHER_LINE_1/);
    assert.match(wizard, /ONBOARDING_MOTHER_LINE_2/);
    assert.match(wizard, /progressLabel|de 5 prontos/);
    assert.equal(wizard.includes('ownerFirstName'), false);
    assert.equal(wizard.includes('Olá'), false);
    assert.equal(wizard.includes('Exportar PDF'), false);
    assert.equal(wizard.includes('Trazer quem já compra'), false);
    assert.equal(wizard.includes('Conectar o WhatsApp da loja'), false);
    assert.equal(wizard.includes('listWhatsappConnections'), false);
  });

  it('puts mother lines first; Deixe a loja pronta is only a checklist label', () => {
    const mother1 = wizard.indexOf('ONBOARDING_MOTHER_LINE_1');
    const mother2 = wizard.indexOf('ONBOARDING_MOTHER_LINE_2');
    const label = wizard.indexOf('ONBOARDING_CHECKLIST_LABEL');
    assert.ok(mother1 >= 0 && mother2 > mother1);
    assert.ok(label > mother2, 'checklist label must come after mother lines');
    assert.match(wizard, /<h1[\s>]/);
    const h1 = wizard.indexOf('<h1');
    const h1Close = wizard.indexOf('</h1>', h1);
    const h1Block = wizard.slice(h1, h1Close);
    assert.match(h1Block, /ONBOARDING_MOTHER_LINE_1/);
    assert.match(h1Block, /ONBOARDING_MOTHER_LINE_2/);
    assert.equal(h1Block.includes('ONBOARDING_CHECKLIST_LABEL'), false);
    assert.match(wizard, /#0e9254/);
    assert.match(wizard, /#f6fbf6/);
    assert.match(wizard, /#111e15/);
  });

  it('gates Olá, PDF, recuperados, De/Até and charts until 5/5', () => {
    assert.match(dashboard, /shouldShowFullDashboard/);
    const setupReturn = dashboard.indexOf('if (!showFull)');
    const ola = dashboard.indexOf('Olá,');
    const pdf = dashboard.indexOf('Exportar PDF');
    const recuperados = dashboard.indexOf('recuperados no');
    assert.ok(setupReturn >= 0);
    assert.ok(ola > setupReturn);
    assert.ok(pdf > setupReturn);
    assert.ok(recuperados > setupReturn);
    assert.equal(dashboard.includes('listCampaigns'), false);
    assert.equal(dashboard.includes('Fila de campanhas'), false);
    assert.match(wizard, /LOJA_PRONTA_BANNER|Loja pronta/);
  });

  it('empty Clientes/Produtos/Regras open the matching checklist item', () => {
    assert.match(clientes, /onboardingEmptyStateFor\('primeiro-cliente'\)|stepId="primeiro-cliente"|stepId=\{'primeiro-cliente'\}/);
    assert.match(produtos, /onboardingEmptyStateFor\('primeiro-produto'\)|stepId="primeiro-produto"|stepId=\{'primeiro-produto'\}/);
    assert.match(regras, /onboardingEmptyStateFor\('regras'\)|stepId="regras"|stepId=\{'regras'\}/);
    assert.match(emptyState, /Próximo passo/);
    assert.match(clientes, /get\('novo'\)/);
    assert.match(produtos, /get\('novo'\)/);
    assert.match(helper, /clientes\?novo=1/);
    assert.match(helper, /produtos\?novo=1/);
    assert.equal(clientes.includes('Importar planilha do PDV'), false);
    assert.equal(produtos.includes('Importar catálogo'), false);
  });

  it('keeps store WhatsApp optional on Perfil and MP/retirada hashes', () => {
    assert.match(perfil, /Opcional|WhatsappConnectCard/);
    assert.match(payment, /id="mercadopago"/);
    assert.match(payment, /#mercadopago/);
    assert.match(
      readFileSync(
        new URL('../components/painel/fulfillment-settings-card.tsx', import.meta.url),
        'utf8',
      ),
      /fulfillmentNotifyPhone/,
    );
    assert.ok(
      perfil.indexOf('PaymentProvidersCard') < perfil.indexOf('WhatsappConnectCard'),
      'Mercado Pago must appear before optional store WhatsApp on Perfil',
    );
    assert.match(snapshotHook, /getStoreRules/);
    assert.match(pedidos, /OnboardingEmptyState|onboardingEmptyState/);
  });

  it('keeps onboarding setup solid cream — no glass, blur, glow or second accent', () => {
    for (const [name, src] of [
      ['wizard', wizard],
      ['empty-state', emptyState],
    ] as const) {
      assert.equal(
        /backdrop-blur/.test(src),
        false,
        `${name} must not use backdrop-blur (reads as glass)`,
      );
      assert.equal(
        /#f6fbf6\]\//.test(src),
        false,
        `${name} cream must be solid #f6fbf6, not translucent`,
      );
      assert.equal(/glass/i.test(src), false, `${name} must not use glass`);
      assert.equal(
        /\b(indigo|violet|purple|fuchsia)\b/i.test(src),
        false,
        `${name} must not use a second accent`,
      );
      assert.equal(
        /glow|shadow-\[0/i.test(src),
        false,
        `${name} must not use glow`,
      );
      assert.match(src, /#0e9254/, `${name} keeps the green accent`);
      assert.match(src, /#f6fbf6/, `${name} keeps cream`);
      assert.match(src, /#111e15/, `${name} keeps text`);
    }
    assert.match(wizard, /sticky[^"']*bg-\[#f6fbf6\]/);
    assert.doesNotMatch(wizard, /sticky[^"']*backdrop-blur/);
    assert.match(wizard, /LOJA_PRONTA_BANNER/);
    assert.match(wizard, /bg-\[#f6fbf6\]/);
  });

  it('uses didactic 2ª-venda copy without puxar, Instagram, VIP or campaign queue', () => {
    for (const [name, src] of [
      ['helper', helper],
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
