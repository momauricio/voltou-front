/**
 * Product lock: 2nd-sale recovery is operated by Voltou (human + AI),
 * not by the merchant blasting WhatsApp from the lojista panel.
 *
 * Campaign/outreach/payment-link *reads* stay in api.ts for the future
 * internal CRM. Mutations below must not fire from the lojista client.
 */

export const LOJISTA_CANNOT_DISPATCH = true;

export const LOJISTA_DISPATCH_BLOCKED_MESSAGE =
  'Disparos e links de pagamento não estão disponíveis no painel do lojista.';

export function assertLojistaCannotDispatch(): void {
  if (LOJISTA_CANNOT_DISPATCH) {
    throw new Error(LOJISTA_DISPATCH_BLOCKED_MESSAGE);
  }
}

/** UI strings/routes the lojista panel must not expose. */
export const LOJISTA_FORBIDDEN_UI = [
  '/painel/campanhas',
  'Novo disparo',
  'Disparar WhatsApp',
  'Enviar link de pagamento',
  'Disparar a 1ª recuperação',
  'disparos ficam em Campanhas',
  'Ir às campanhas',
] as const;
