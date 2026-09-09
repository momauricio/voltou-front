/**
 * Onboarding v2 do lojista — 5 passos, nesta ordem.
 * WhatsApp da loja no Perfil é opcional e não entra no checklist.
 */

export const ONBOARDING_STEP_IDS = [
  'primeiro-cliente',
  'primeiro-produto',
  'regras',
  'mercado-pago',
  'retirada',
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type OnboardingFacts = {
  customerCount: number;
  productCount: number;
  rulesUpdatedAt: string | null | undefined;
  descontoPadrao?: string | null;
  margemMaxima?: string | null;
  maxDescontoUmProduto?: string | null;
  maxDescontoDoisOuMais?: string | null;
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

/** Locked Marketing top copy — page heading on the setup screen. */
export const ONBOARDING_MOTHER_LINE_1 = 'A 1ª venda você fez no balcão.';
export const ONBOARDING_MOTHER_LINE_2 = 'A 2ª venda a Voltou faz por você.';

/** Checklist section label only — never the page H1. */
export const ONBOARDING_CHECKLIST_LABEL = 'Deixe a loja pronta';

export const LOJA_PRONTA_BANNER = 'Loja pronta ✓';

export const CLIENTE_SENTENCE =
  'Cadastre o 1º cliente — nome e número de quem comprou ou teve interesse.';
export const CLIENTE_CTA = 'Cadastrar cliente';
export const CLIENTE_HREF = '/painel/clientes?novo=1';
export const CLIENTE_TITLE = 'Cliente';

export const PRODUTO_SENTENCE = 'Cadastre 1 produto que já está na arara.';
export const PRODUTO_CTA = 'Cadastrar produto';
export const PRODUTO_HREF = '/painel/produtos?novo=1';
export const PRODUTO_TITLE = 'Produto';

export const REGRAS_SENTENCE =
  'Defina o teto de desconto da loja — a Voltou usa isso na 2ª venda.';
export const REGRAS_CTA = 'Definir regras';
export const REGRAS_HREF = '/painel/regras#regras-teto';
export const REGRAS_TITLE = 'Regras';

export const MERCADO_PAGO_SENTENCE =
  'Conecte o Mercado Pago pra receber quando a venda fechar.';
export const MERCADO_PAGO_CTA = 'Conectar Mercado Pago';
export const MERCADO_PAGO_HREF = '/painel/perfil#mercadopago';
export const MERCADO_PAGO_TITLE = 'Mercado Pago';

export const RETIRADA_SENTENCE =
  'Informe o endereço de retirada e o WhatsApp de aviso de pedido.';
export const RETIRADA_CTA = 'Cadastrar retirada';
export const RETIRADA_TITLE = 'Retirada';
export const PICKUP_ONBOARDING_HREF = '/painel/regras#fulfillmentPickup';
export const ORDER_NOTIFY_ONBOARDING_HREF =
  '/painel/regras#fulfillmentNotifyPhone';
export const RETIRADA_HREF = PICKUP_ONBOARDING_HREF;

const STEP_COPY: Record<
  OnboardingStepId,
  { title: string; sentence: string; cta: string; href: string }
> = {
  'primeiro-cliente': {
    title: CLIENTE_TITLE,
    sentence: CLIENTE_SENTENCE,
    cta: CLIENTE_CTA,
    href: CLIENTE_HREF,
  },
  'primeiro-produto': {
    title: PRODUTO_TITLE,
    sentence: PRODUTO_SENTENCE,
    cta: PRODUTO_CTA,
    href: PRODUTO_HREF,
  },
  regras: {
    title: REGRAS_TITLE,
    sentence: REGRAS_SENTENCE,
    cta: REGRAS_CTA,
    href: REGRAS_HREF,
  },
  'mercado-pago': {
    title: MERCADO_PAGO_TITLE,
    sentence: MERCADO_PAGO_SENTENCE,
    cta: MERCADO_PAGO_CTA,
    href: MERCADO_PAGO_HREF,
  },
  retirada: {
    title: RETIRADA_TITLE,
    sentence: RETIRADA_SENTENCE,
    cta: RETIRADA_CTA,
    href: RETIRADA_HREF,
  },
};

function parsePct(raw: string | null | undefined): number | null {
  const n = Number.parseFloat(
    String(raw ?? '')
      .replace('%', '')
      .replace(',', '.')
      .trim(),
  );
  return Number.isFinite(n) ? n : null;
}

function hasDiscountCeiling(facts: OnboardingFacts): boolean {
  return (
    parsePct(facts.margemMaxima) != null ||
    parsePct(facts.maxDescontoUmProduto) != null ||
    parsePct(facts.maxDescontoDoisOuMais) != null ||
    parsePct(facts.descontoPadrao) != null
  );
}

export function isRegrasComplete(facts: OnboardingFacts): boolean {
  return Boolean(facts.rulesUpdatedAt?.trim()) && hasDiscountCeiling(facts);
}

function hasPickupAddress(facts: OnboardingFacts): boolean {
  return Boolean(facts.pickupAddressText?.trim());
}

function hasOrderNotifyPhone(facts: OnboardingFacts): boolean {
  return Boolean(facts.orderNotifyPhoneE164?.trim());
}

export function isRetiradaComplete(facts: OnboardingFacts): boolean {
  return hasPickupAddress(facts) && hasOrderNotifyPhone(facts);
}

export function retiradaHref(facts: OnboardingFacts): string {
  if (!hasPickupAddress(facts)) return PICKUP_ONBOARDING_HREF;
  if (!hasOrderNotifyPhone(facts)) return ORDER_NOTIFY_ONBOARDING_HREF;
  return '/painel/regras';
}

export function evaluateOnboarding(facts: OnboardingFacts): OnboardingSnapshot {
  const hasFirstClient = facts.customerCount > 0;
  const hasFirstProduct = facts.productCount > 0;
  const regrasDone = isRegrasComplete(facts);
  const mpDone = Boolean(facts.mercadoPagoConnected);
  const retiradaDone = isRetiradaComplete(facts);

  const steps: OnboardingStepView[] = [
    {
      id: 'primeiro-cliente',
      ...STEP_COPY['primeiro-cliente'],
      done: hasFirstClient,
    },
    {
      id: 'primeiro-produto',
      ...STEP_COPY['primeiro-produto'],
      done: hasFirstProduct,
    },
    {
      id: 'regras',
      ...STEP_COPY.regras,
      done: regrasDone,
    },
    {
      id: 'mercado-pago',
      ...STEP_COPY['mercado-pago'],
      done: mpDone,
    },
    {
      id: 'retirada',
      ...STEP_COPY.retirada,
      href: retiradaHref(facts),
      done: retiradaDone,
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
  snapshot: Pick<OnboardingSnapshot, 'allDone'>,
): boolean {
  return snapshot.allDone;
}

export function progressLabel(
  snapshot: Pick<OnboardingSnapshot, 'completedCount' | 'steps'>,
): string {
  return `${snapshot.completedCount} de ${snapshot.steps.length} prontos`;
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

export function onboardingEmptyStateFor(
  stepId: OnboardingStepId,
): OnboardingEmptyState {
  const copy = STEP_COPY[stepId];
  return {
    sentence: copy.sentence,
    cta: copy.cta,
    href: copy.href,
  };
}

export function stepById(
  snapshot: OnboardingSnapshot,
  stepId: OnboardingStepId,
): OnboardingStepView | undefined {
  return snapshot.steps.find((step) => step.id === stepId);
}
