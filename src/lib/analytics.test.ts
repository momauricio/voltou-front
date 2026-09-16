import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  ANALYTICS_EVENTS,
  FORBIDDEN_DATALAYER_KEYS,
  GA4_MEASUREMENT_ID_GTM_ONLY,
  GTM_CONTAINER_ID,
  ONBOARDING_STEP_ANALYTICS,
  POSTHOG_HOST_FALLBACK,
  POSTHOG_KEY_FALLBACK,
  POSTHOG_PROJECT_ID,
  assertNoPiiKeys,
  centsToAmountBrl,
  diffOnboardingAnalytics,
  isForbiddenDataLayerKey,
  pushDataLayer,
  resetAnalyticsSinksForTests,
  setAnalyticsSinks,
  trackCheckoutCreated,
  trackClickCtaCriarConta,
  trackCommissionEarned,
  trackOnboardingComplete,
  trackOnboardingStepComplete,
  trackPaymentApproved,
  trackSignUp,
  trackViewLanding,
} from './analytics.ts';
import { evaluateOnboarding, type OnboardingFacts } from './lojista-onboarding.ts';

const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const analyticsSrc = readFileSync(new URL('./analytics.ts', import.meta.url), 'utf8');
const csp = readFileSync(
  new URL('./content-security-policy.ts', import.meta.url),
  'utf8',
);

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

const docs = readFileSync(new URL('../../docs/analytics.md', import.meta.url), 'utf8');
const envExample = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
const dockerfile = readFileSync(new URL('../../Dockerfile', import.meta.url), 'utf8');

function withAnalytics<T>(
  run: (
    pushed: Record<string, unknown>[],
    captured: { event: string; properties: Record<string, unknown> }[],
    identified: string[],
  ) => T,
): T {
  const pushed: Record<string, unknown>[] = [];
  const captured: { event: string; properties: Record<string, unknown> }[] = [];
  const identified: string[] = [];
  const previous = globalThis.window;
  globalThis.window = { dataLayer: pushed } as unknown as Window & typeof globalThis;
  setAnalyticsSinks({
    capture: (event, properties) => captured.push({ event, properties }),
    identify: (id) => identified.push(id),
  });
  try {
    return run(pushed, captured, identified);
  } finally {
    resetAnalyticsSinksForTests();
    if (previous === undefined) {
      // @ts-expect-error restore node
      delete globalThis.window;
    } else {
      globalThis.window = previous;
    }
  }
}

describe('GTM container in root layout', () => {
  it('embeds locked GTM-W93ND43T as high as possible (script + noscript)', () => {
    assert.equal(GTM_CONTAINER_ID, 'GTM-W93ND43T');
    assert.match(layout, /GTM-W93ND43T/);
    assert.match(layout, /googletagmanager\.com\/gtm\.js/);
    assert.match(
      layout,
      /https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-W93ND43T/,
    );
    assert.match(layout, /beforeInteractive/);
    assert.match(layout, /<noscript>/);
    assert.match(layout, /dataLayer/);
    assert.match(layout, /AnalyticsProvider/);
    assert.doesNotMatch(layout, /G-2YWN3RYNNF/);
    assert.doesNotMatch(layout, /gtag\s*\(/);
    assert.doesNotMatch(layout, /googletagmanager\.com\/gtag\/js/);
    assert.doesNotMatch(layout, /\bG-[A-Z0-9]{6,}\b/);
  });

  it('documents GA4 G-2YWN3RYNNF for GTM only — never as a Next gtag install', () => {
    assert.equal(GA4_MEASUREMENT_ID_GTM_ONLY, 'G-2YWN3RYNNF');
    assert.match(docs, /G-2YWN3RYNNF/);
    assert.match(docs, /Google Analytics: GA4 Configuration/);
    assert.match(docs, /All Pages/);
    assert.match(docs, /Do not install gtag\.js/i);
    assert.match(envExample, /G-2YWN3RYNNF/);
    assert.match(envExample, /do NOT add gtag\.js/);
  });

  it('locks PostHog project 611758 with public client key fallback', () => {
    assert.equal(POSTHOG_PROJECT_ID, '611758');
    assert.equal(
      POSTHOG_KEY_FALLBACK,
      'phc_C4xU3pGsWVQbxMiYPmEccxfqJuuAZT3JhTXPK6BwCrec',
    );
    assert.equal(POSTHOG_HOST_FALLBACK, 'https://us.i.posthog.com');
    assert.match(envExample, /NEXT_PUBLIC_POSTHOG_KEY=/);
    assert.match(envExample, /NEXT_PUBLIC_POSTHOG_HOST=https:\/\/us\.i\.posthog\.com/);
    assert.match(dockerfile, /NEXT_PUBLIC_POSTHOG_KEY=/);
    assert.match(layout, /AnalyticsProvider/);
  });

  it('allows GTM in CSP script-src and frame-src', () => {
    assert.match(csp, /googletagmanager\.com/);
  });
});

describe('dataLayer event taxonomy', () => {
  it('locks event name constants to the Jack / Schwartz list', () => {
    assert.deepEqual(ANALYTICS_EVENTS, {
      view_landing: 'view_landing',
      click_cta_criar_conta: 'click_cta_criar_conta',
      sign_up: 'sign_up',
      onboarding_step_complete: 'onboarding_step_complete',
      onboarding_complete: 'onboarding_complete',
      checkout_created: 'checkout_created',
      payment_approved: 'payment_approved',
      commission_earned: 'commission_earned',
    });
  });

  it('maps onboarding snapshot ids to locked step names', () => {
    assert.deepEqual(ONBOARDING_STEP_ANALYTICS, {
      'primeiro-cliente': { step: 1, step_name: 'cliente' },
      'primeiro-produto': { step: 2, step_name: 'produto' },
      regras: { step: 3, step_name: 'regras' },
      'mercado-pago': { step: 4, step_name: 'mercado_pago' },
      retirada: { step: 5, step_name: 'retirada' },
    });
  });
});

describe('dataLayer PII guard', () => {
  it('lists and rejects obvious PII field names', () => {
    for (const key of [
      'phone',
      'email',
      'whatsapp',
      'cnpj',
      'cpf',
      'document',
      'customer_name',
      'customerName',
      'merchant_email',
      'merchantEmail',
      'phoneE164',
      'payerEmail',
    ]) {
      assert.equal(isForbiddenDataLayerKey(key), true, key);
      assert.throws(
        () => assertNoPiiKeys({ event: 'sign_up', [key]: 'secret' }),
        /PII/,
      );
      assert.throws(
        () => pushDataLayer({ event: 'sign_up', [key]: 'secret' }),
        /PII/,
      );
    }
    assert.ok(FORBIDDEN_DATALAYER_KEYS.includes('phone'));
    assert.ok(FORBIDDEN_DATALAYER_KEYS.includes('email'));
    assert.ok(FORBIDDEN_DATALAYER_KEYS.includes('cnpj'));
    assert.ok(FORBIDDEN_DATALAYER_KEYS.includes('document'));
    assert.ok(FORBIDDEN_DATALAYER_KEYS.includes('customer_name'));
    assert.ok(FORBIDDEN_DATALAYER_KEYS.includes('merchant_email'));
  });

  it('allows taxonomy fields and still blocks nested PII', () => {
    assert.equal(isForbiddenDataLayerKey('page_path'), false);
    assert.equal(isForbiddenDataLayerKey('step_name'), false);
    assert.equal(isForbiddenDataLayerKey('store_id'), false);
    assert.equal(isForbiddenDataLayerKey('amount_brl'), false);
    assert.doesNotThrow(() =>
      assertNoPiiKeys({
        event: 'payment_approved',
        store_id: 'store_1',
        order_id: 'ord_1',
        amount_brl: 19.9,
      }),
    );
    assert.throws(
      () =>
        assertNoPiiKeys({
          event: 'sign_up',
          nested: { customer_name: 'Maria' },
        }),
      /PII/,
    );
  });

  it('never ships PII keys as event fields', () => {
    assert.match(analyticsSrc, /Never send phone/);
    assert.match(analyticsSrc, /FORBIDDEN_DATALAYER_KEYS/);
  });
});

describe('typed event helpers', () => {
  it('pushes view_landing, CTA, sign_up and onboarding without PII', () => {
    withAnalytics((pushed, captured, identified) => {
      trackViewLanding({ page_path: '/', referrer: 'https://google.com/' });
      trackClickCtaCriarConta('hero');
      trackSignUp('email');
      trackSignUp('google', { store_id: 'store_abc' });
      trackOnboardingStepComplete({ step: 1, step_name: 'cliente' });
      trackOnboardingComplete();
      assert.equal(pushed[0]?.event, 'view_landing');
      assert.equal(pushed[0]?.page_path, '/');
      assert.equal(pushed[1]?.cta_location, 'hero');
      assert.equal(pushed[2]?.method, 'email');
      assert.equal(pushed[3]?.method, 'google');
      assert.equal(pushed[4]?.step, 1);
      assert.equal(pushed[5]?.steps_done, 5);
      assert.equal(captured.length, 6);
      assert.equal(captured[0]?.event, 'view_landing');
      assert.equal(captured[2]?.event, 'sign_up');
      assert.equal(identified.length, 2);
      assert.match(identified[0]!, /^signup_/);
      assert.equal(identified[1], 'store_abc');
      for (const row of pushed) {
        assert.equal('email' in row, false);
        assert.equal('phone' in row, false);
        assert.equal('cnpj' in row, false);
      }
    });
  });

  it('pushes checkout/payment/commission amounts in BRL', () => {
    withAnalytics((pushed, captured) => {
      assert.equal(centsToAmountBrl(1990), 19.9);
      trackCheckoutCreated({
        store_id: 'store_1',
        order_id: 'chk_1',
        amount_brl: centsToAmountBrl(1990),
      });
      trackPaymentApproved({
        store_id: 'store_1',
        order_id: 'chk_1',
        amount_brl: 19.9,
      });
      trackCommissionEarned({
        store_id: 'store_1',
        order_id: 'chk_1',
        amount_brl: 19.9,
        commission_brl: 1.0,
      });
      assert.equal(pushed[0]?.event, 'checkout_created');
      assert.equal(pushed[1]?.event, 'payment_approved');
      assert.equal(pushed[2]?.event, 'commission_earned');
      assert.equal(pushed[2]?.commission_brl, 1);
      assert.equal(captured[2]?.event, 'commission_earned');
    });
  });

  it('documents that commission_earned has no front webhook yet', () => {
    assert.match(analyticsSrc, /TODO: commission_earned is confirmed server-side/);
  });
});

describe('onboarding snapshot diffs', () => {
  it('seeds already-done steps without firing, then emits flips and 5/5', () => {
    const none = evaluateOnboarding(emptyFacts);
    const seeded = diffOnboardingAnalytics(null, none);
    assert.deepEqual(seeded.stepEvents, []);
    assert.equal(seeded.complete, false);
    assert.deepEqual(seeded.next.doneIds, []);

    const clienteDone = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
    });
    const afterCliente = diffOnboardingAnalytics(seeded.next, clienteDone);
    assert.deepEqual(afterCliente.stepEvents, [
      { step: 1, step_name: 'cliente' },
    ]);
    assert.equal(afterCliente.complete, false);

    const allDone = evaluateOnboarding({
      ...emptyFacts,
      customerCount: 1,
      productCount: 1,
      rulesUpdatedAt: '2026-01-01',
      margemMaxima: '10',
      mercadoPagoConnected: true,
      pickupAddressText: 'Rua A, 1',
      orderNotifyPhoneE164: '+5511999999999',
    });
    const afterAll = diffOnboardingAnalytics(afterCliente.next, allDone);
    assert.deepEqual(
      afterAll.stepEvents.map((event) => event.step_name),
      ['produto', 'regras', 'mercado_pago', 'retirada'],
    );
    assert.equal(afterAll.complete, true);
    assert.equal(afterAll.next.completeFired, true);
  });
});

describe('front call-site wiring', () => {
  it('tracks landing view and criar-conta CTAs (hero, footer, nav)', () => {
    const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
    const hero = readFileSync(
      new URL('../components/landing/landing-hero.tsx', import.meta.url),
      'utf8',
    );
    const footerCta = readFileSync(
      new URL('../components/landing/landing-cta.tsx', import.meta.url),
      'utf8',
    );
    const nav = readFileSync(
      new URL('../components/landing/landing-nav.tsx', import.meta.url),
      'utf8',
    );
    assert.match(home, /LandingViewTracker/);
    assert.match(hero, /trackClickCtaCriarConta\('hero'\)/);
    assert.match(footerCta, /trackClickCtaCriarConta\('footer'\)/);
    assert.match(nav, /trackClickCtaCriarConta\('nav'\)/);
  });

  it('tracks sign_up after email and google register, and onboarding diffs from the snapshot hook', () => {
    const auth = readFileSync(
      new URL('../components/auth/auth-form.tsx', import.meta.url),
      'utf8',
    );
    const hook = readFileSync(
      new URL('../components/painel/use-onboarding-snapshot.ts', import.meta.url),
      'utf8',
    );
    assert.match(auth, /trackSignUp\('email'\)/);
    assert.match(auth, /trackSignUp\('google'/);
    assert.match(auth, /store_id: result\.user\.storeId/);
    assert.doesNotMatch(auth, /trackSignUp\('email'.+email/);
    assert.match(hook, /applyOnboardingSnapshot/);
  });

  it('tracks checkout_created in staff CRM and payment_approved on brick + /obrigado', () => {
    const staff = readFileSync(
      new URL('../components/equipe/staff-customers-panel.tsx', import.meta.url),
      'utf8',
    );
    const brick = readFileSync(
      new URL('../components/checkout/transparent-checkout-brick.tsx', import.meta.url),
      'utf8',
    );
    const obrigado = readFileSync(
      new URL('../app/obrigado/[slug]/[cupom]/page.tsx', import.meta.url),
      'utf8',
    );
    assert.match(staff, /trackCheckoutCreated/);
    assert.match(brick, /trackPaymentApproved/);
    assert.match(obrigado, /trackPaymentApproved/);
    const createdCall = staff.match(/trackCheckoutCreated\(\{[\s\S]*?\}\)/);
    assert.ok(createdCall, 'staff must call trackCheckoutCreated with an object');
    assert.doesNotMatch(createdCall[0], /phone|email|cnpj|customerName/i);
    const paidCall = obrigado.match(/trackPaymentApproved\(\{[\s\S]*?\}\)/);
    assert.ok(paidCall, 'obrigado must call trackPaymentApproved with an object');
    assert.doesNotMatch(paidCall[0], /phone|email|cnpj|customerName/i);
  });
});
