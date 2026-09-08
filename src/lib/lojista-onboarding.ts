/**
 * VOL-29 — onboarding do lojista: no máximo 3 tarefas, nesta ordem.
 * A conexão de vendas no Perfil é opcional e não entra no checklist.
 */

export const ONBOARDING_STEP_IDS = [
  'primeiro-cliente',
  'primeiro-produto',
  'loja-pronta',
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type OnboardingFacts = {
  customerCount: number;
  productCount: number;
  mercadoPagoConnected: boolean;
  pickupAddressText: string | null | undefined;
  orderNotifyPhoneE164: string | null | undefined;
};

export type OnboardingStepView = {
  id: OnboardingStepId;
  title: string;
  sentence: string;
  cta: string;
  href: string;
  done: boolean;
};

export type OnboardingSnapshot = {
  steps: OnboardingStepView[];
  next: OnboardingStepView | null;
  completedCount: number;
  hasFirstClient: boolean;
  allDone: boolean;
};

export type OnboardingEmptyState = {
  sentence: string;
  cta: string;
  href: string;
};

export const ONBOARDING_HOME_EYEBROW = 'Comece por aqui';
export const ONBOARDING_HOME_TITLE = 'Três passos para a loja ficar pronta';
export const ONBOARDING_HOME_SUBTITLE =
  'A 2ª venda a Voltou faz por você. Primeiro, cadastre o essencial.';

export const PRIMEIRO_CLIENTE_SENTENCE =
  'Cadastre o 1º cliente — nome e número.';
export const PRIMEIRO_CLIENTE_CTA = 'Cadastrar 1º cliente';
export const PRIMEIRO_CLIENTE_HREF = '/painel/clientes?novo=1';

export const PRIMEIRO_PRODUTO_SENTENCE =
  'Cadastre 1 produto para a Voltou saber o que oferecer.';
export const PRIMEIRO_PRODUTO_CTA = 'Cadastrar 1 produto';
export const PRIMEIRO_PRODUTO_HREF = '/painel/produtos?novo=1';

export const LOJA_PRONTA_SENTENCE =
  'Conecte o Mercado Pago, o endereço de retirada e o WhatsApp de aviso de pedido.';
export const LOJA_PRONTA_TITLE = 'Deixar a loja pronta para vender';

export const MERCADO_PAGO_HREF = '/painel/perfil#mercadopago';
export const PICKUP_ONBOARDING_HREF = '/painel/regras#fulfillmentPickup';
export const ORDER_NOTIFY_ONBOARDING_HREF =
  '/painel/regras#fulfillmentNotifyPhone';

function hasPickupAddress(facts: OnboardingFacts): boolean {
  return Boolean(facts.pickupAddressText?.trim());
}

function hasOrderNotifyPhone(facts: OnboardingFacts): boolean {
  return Boolean(facts.orderNotifyPhoneE164?.trim());
}

export function isStoreReadyComplete(facts: OnboardingFacts): boolean {
  return (
    facts.mercadoPagoConnected &&
    hasPickupAddress(facts) &&
    hasOrderNotifyPhone(facts)
  );
}

export function storeReadyHref(facts: OnboardingFacts): string {
  if (!facts.mercadoPagoConnected) return MERCADO_PAGO_HREF;
  if (!hasPickupAddress(facts)) return PICKUP_ONBOARDING_HREF;
  if (!hasOrderNotifyPhone(facts)) return ORDER_NOTIFY_ONBOARDING_HREF;
  return '/painel/regras';
}

export function storeReadyCta(facts: OnboardingFacts): string {
  if (!facts.mercadoPagoConnected) return 'Conectar Mercado Pago';
  if (!hasPickupAddress(facts)) return 'Cadastrar endereço de retirada';
  if (!hasOrderNotifyPhone(facts)) return 'Cadastrar WhatsApp de aviso';
  return 'Loja pronta';
}

export function evaluateOnboarding(facts: OnboardingFacts): OnboardingSnapshot {
  const hasFirstClient = facts.customerCount > 0;
  const hasFirstProduct = facts.productCount > 0;
  const storeReady = isStoreReadyComplete(facts);

  const steps: OnboardingStepView[] = [
    {
      id: 'primeiro-cliente',
      title: 'Cadastrar o 1º cliente',
      sentence: PRIMEIRO_CLIENTE_SENTENCE,
      cta: PRIMEIRO_CLIENTE_CTA,
      href: PRIMEIRO_CLIENTE_HREF,
      done: hasFirstClient,
    },
    {
      id: 'primeiro-produto',
      title: 'Cadastrar 1 produto',
      sentence: PRIMEIRO_PRODUTO_SENTENCE,
      cta: PRIMEIRO_PRODUTO_CTA,
      href: PRIMEIRO_PRODUTO_HREF,
      done: hasFirstProduct,
    },
    {
      id: 'loja-pronta',
      title: LOJA_PRONTA_TITLE,
      sentence: LOJA_PRONTA_SENTENCE,
      cta: storeReadyCta(facts),
      href: storeReadyHref(facts),
      done: storeReady,
    },
  ];

  const next = steps.find((step) => !step.done) ?? null;
  const completedCount = steps.filter((step) => step.done).length;

  return {
    steps,
    next,
    completedCount,
    hasFirstClient,
    allDone: completedCount === steps.length,
  };
}

export function shouldShowFullDashboard(
  snapshot: Pick<OnboardingSnapshot, 'hasFirstClient' | 'allDone'>,
): boolean {
  return snapshot.hasFirstClient || snapshot.allDone;
}

export function onboardingEmptyState(
  snapshot: OnboardingSnapshot,
): OnboardingEmptyState | null {
  if (!snapshot.next) return null;
  return {
    sentence: snapshot.next.sentence,
    cta: snapshot.next.cta,
    href: snapshot.next.href,
  };
}
