/**
 * Voltou analytics — Eugene Schwartz / Jack taxonomy (LOCKED).
 * GTM container GTM-W93ND43T loads tags (including GA4). Do NOT add gtag.js here.
 * PostHog project 611758 (Voltou) captures the same events client-side.
 * Never send phone, email, WhatsApp, customer name, merchant email, or document/CNPJ.
 */

import type { OnboardingSnapshot, OnboardingStepId } from './lojista-onboarding.ts';

export const GTM_CONTAINER_ID = 'GTM-W93ND43T';

/**
 * Configure this Measurement ID inside GTM — never load gtag.js / gtag('config') in Next.
 * See docs/analytics.md.
 */
export const GA4_MEASUREMENT_ID_GTM_ONLY = 'G-2YWN3RYNNF';

/** PostHog project 611758 (Voltou). Client key is public by design. */
export const POSTHOG_PROJECT_ID = '611758';
export const POSTHOG_KEY_FALLBACK =
  'phc_C4xU3pGsWVQbxMiYPmEccxfqJuuAZT3JhTXPK6BwCrec';
export const POSTHOG_HOST_FALLBACK = 'https://us.i.posthog.com';

export function resolvePosthogKey(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || POSTHOG_KEY_FALLBACK;
}

export function resolvePosthogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_HOST_FALLBACK;
}

export const ANALYTICS_EVENTS = {
  view_landing: 'view_landing',
  click_cta_criar_conta: 'click_cta_criar_conta',
  sign_up: 'sign_up',
  onboarding_step_complete: 'onboarding_step_complete',
  onboarding_complete: 'onboarding_complete',
  checkout_created: 'checkout_created',
  payment_approved: 'payment_approved',
  commission_earned: 'commission_earned',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type CtaLocation = 'hero' | 'footer' | 'nav';
export type SignUpMethod = 'email' | 'google' | 'whatsapp';
export type OnboardingStepNumber = 1 | 2 | 3 | 4 | 5;
export type OnboardingStepName =
  | 'cliente'
  | 'produto'
  | 'regras'
  | 'mercado_pago'
  | 'retirada';

export const ONBOARDING_STEP_ANALYTICS: Record<
  OnboardingStepId,
  { step: OnboardingStepNumber; step_name: OnboardingStepName }
> = {
  'primeiro-cliente': { step: 1, step_name: 'cliente' },
  'primeiro-produto': { step: 2, step_name: 'produto' },
  regras: { step: 3, step_name: 'regras' },
  'mercado-pago': { step: 4, step_name: 'mercado_pago' },
  retirada: { step: 5, step_name: 'retirada' },
};

/** Obvious PII field names — never allowed on dataLayer or PostHog capture. */
export const FORBIDDEN_DATALAYER_KEYS = [
  'phone',
  'email',
  'whatsapp',
  'cnpj',
  'cpf',
  'document',
  'documento',
  'telefone',
  'customer_name',
  'customerName',
  'merchant_email',
  'merchantEmail',
  'owner_name',
  'ownerName',
  'owner_phone',
  'ownerPhone',
  'phone_e164',
  'phoneE164',
  'payer_email',
  'payerEmail',
] as const;

const FORBIDDEN_KEY_PATTERN =
  /phone|email|whatsapp|cnpj|cpf|document|documento|telefone|customer_?name|merchant_?email|owner_?name/i;

export type DataLayerObject = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerObject[];
  }
}

export function isForbiddenDataLayerKey(key: string): boolean {
  if (key === 'event' || key === 'step_name' || key === 'page_path') return false;
  if (
    (FORBIDDEN_DATALAYER_KEYS as readonly string[]).includes(key) ||
    FORBIDDEN_KEY_PATTERN.test(key)
  ) {
    return true;
  }
  return false;
}

export function assertNoPiiKeys(payload: unknown, path = ''): void {
  if (payload == null || typeof payload !== 'object') return;
  if (Array.isArray(payload)) {
    payload.forEach((item, index) => assertNoPiiKeys(item, `${path}[${index}]`));
    return;
  }
  for (const [key, value] of Object.entries(payload as DataLayerObject)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (isForbiddenDataLayerKey(key)) {
      throw new Error(`analytics forbids PII key: ${nextPath}`);
    }
    assertNoPiiKeys(value, nextPath);
  }
}

export function centsToAmountBrl(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export type AnalyticsSinks = {
  capture?: (event: string, properties: Record<string, unknown>) => void;
  identify?: (distinctId: string) => void;
};

let sinks: AnalyticsSinks = {};

export function setAnalyticsSinks(next: AnalyticsSinks): void {
  sinks = next;
}

export function resetAnalyticsSinksForTests(): void {
  sinks = {};
}

export function anonymousSignupDistinctId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `signup_${crypto.randomUUID()}`;
  }
  return `signup_${Date.now()}`;
}

export function identifyAfterSignup(storeId?: string | null): void {
  const distinctId = storeId?.trim() || anonymousSignupDistinctId();
  sinks.identify?.(distinctId);
}

export function pushDataLayer(payload: DataLayerObject): void {
  assertNoPiiKeys(payload);
  const event = payload.event;
  if (typeof event !== 'string' || !event) {
    throw new Error('analytics payload requires event');
  }
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  }
  const properties = { ...payload };
  delete properties.event;
  sinks.capture?.(event, properties);
}

export function trackViewLanding(input?: {
  page_path?: string;
  referrer?: string;
}): void {
  const page_path =
    input?.page_path ??
    (typeof window !== 'undefined' ? window.location?.pathname ?? '/' : '/');
  const referrer =
    input?.referrer ??
    (typeof document !== 'undefined' ? document.referrer ?? '' : '');
  pushDataLayer({
    event: ANALYTICS_EVENTS.view_landing,
    page_path,
    referrer,
  });
}

export function trackClickCtaCriarConta(cta_location: CtaLocation): void {
  const page_path =
    typeof window !== 'undefined' ? window.location?.pathname ?? '/' : '/';
  pushDataLayer({
    event: ANALYTICS_EVENTS.click_cta_criar_conta,
    cta_location,
    page_path,
  });
}

export function trackSignUp(
  method: SignUpMethod,
  input?: { store_id?: string | null },
): void {
  identifyAfterSignup(input?.store_id);
  pushDataLayer({
    event: ANALYTICS_EVENTS.sign_up,
    method,
  });
}

export function trackOnboardingStepComplete(input: {
  step: OnboardingStepNumber;
  step_name: OnboardingStepName;
}): void {
  pushDataLayer({
    event: ANALYTICS_EVENTS.onboarding_step_complete,
    step: input.step,
    step_name: input.step_name,
  });
}

export function trackOnboardingComplete(): void {
  pushDataLayer({
    event: ANALYTICS_EVENTS.onboarding_complete,
    steps_done: 5,
  });
}

export function trackCheckoutCreated(input: {
  store_id: string;
  order_id: string;
  amount_brl: number;
}): void {
  pushDataLayer({
    event: ANALYTICS_EVENTS.checkout_created,
    store_id: input.store_id,
    order_id: input.order_id,
    amount_brl: input.amount_brl,
  });
}

export function trackPaymentApproved(input: {
  store_id: string;
  order_id: string;
  amount_brl: number;
}): void {
  pushDataLayer({
    event: ANALYTICS_EVENTS.payment_approved,
    store_id: input.store_id,
    order_id: input.order_id,
    amount_brl: input.amount_brl,
  });
}

/**
 * TODO: commission_earned is confirmed server-side (payment webhook / ledger).
 * There is no dedicated front page for a single commission credit. Call this
 * helper from a future server-to-client signal; do not invent a webhook here.
 */
export function trackCommissionEarned(input: {
  store_id: string;
  order_id: string;
  amount_brl: number;
  commission_brl: number;
}): void {
  pushDataLayer({
    event: ANALYTICS_EVENTS.commission_earned,
    store_id: input.store_id,
    order_id: input.order_id,
    amount_brl: input.amount_brl,
    commission_brl: input.commission_brl,
  });
}

const ONCE_PREFIX = 'voltou_dl_once_';

function browserSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function trackOnce(key: string, fire: () => void): void {
  const storage = browserSessionStorage();
  if (storage) {
    try {
      const full = `${ONCE_PREFIX}${key}`;
      if (storage.getItem(full)) return;
      storage.setItem(full, '1');
    } catch {
      /* private mode / quota */
    }
  }
  fire();
}

export type OnboardingAnalyticsState = {
  doneIds: OnboardingStepId[];
  completeFired: boolean;
};

export function diffOnboardingAnalytics(
  prev: OnboardingAnalyticsState | null,
  snapshot: Pick<OnboardingSnapshot, 'steps' | 'allDone'>,
): {
  next: OnboardingAnalyticsState;
  stepEvents: { step: OnboardingStepNumber; step_name: OnboardingStepName }[];
  complete: boolean;
} {
  if (!prev) {
    return {
      next: {
        doneIds: snapshot.steps
          .filter((step) => step.done)
          .map((step) => step.id),
        completeFired: snapshot.allDone,
      },
      stepEvents: [],
      complete: false,
    };
  }

  const doneIds = [...prev.doneIds];
  const stepEvents: { step: OnboardingStepNumber; step_name: OnboardingStepName }[] =
    [];

  for (const step of snapshot.steps) {
    if (step.done && !prev.doneIds.includes(step.id)) {
      doneIds.push(step.id);
      stepEvents.push(ONBOARDING_STEP_ANALYTICS[step.id]);
    }
  }

  const complete = snapshot.allDone && !prev.completeFired;
  return {
    next: {
      doneIds,
      completeFired: prev.completeFired || snapshot.allDone,
    },
    stepEvents,
    complete,
  };
}

const ONBOARDING_STATE_KEY = 'voltou_dl_onboarding';

export function readOnboardingAnalyticsState(): OnboardingAnalyticsState | null {
  const storage = browserSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(ONBOARDING_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingAnalyticsState;
    if (!Array.isArray(parsed.doneIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOnboardingAnalyticsState(
  state: OnboardingAnalyticsState,
): void {
  const storage = browserSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function applyOnboardingSnapshot(
  snapshot: Pick<OnboardingSnapshot, 'steps' | 'allDone'>,
): void {
  const prev = readOnboardingAnalyticsState();
  const { next, stepEvents, complete } = diffOnboardingAnalytics(prev, snapshot);
  for (const payload of stepEvents) {
    trackOnboardingStepComplete(payload);
  }
  if (complete) trackOnboardingComplete();
  writeOnboardingAnalyticsState(next);
}
