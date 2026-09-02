/**
 * Lojista panel honesty: never mix demo/fake metrics into a logged-in session.
 * Recovery campaign queues stay with Voltou staff, not the merchant UI.
 */

export function lojistaDemoBannerVisible(input: {
  accessToken: string | null | undefined;
}): boolean {
  void input.accessToken;
  // /painel is session-gated. Demo copy must never appear — including the first
  // paint before tenant context resolves, and when the API errors.
  return false;
}

export function lojistaApiLoadError(cause?: string): string {
  const suffix = cause?.trim() ? ` (${cause.trim()})` : '';
  return `Não foi possível carregar os dados${suffix}. Tente de novo.`;
}

export type MerchantFunnelInput = {
  contacted: number;
  interested: number;
  checkoutsSent: number;
  checkoutsPaid: number;
};

export type MerchantFunnelStep = {
  label: string;
  value: number;
  emphasis?: boolean;
};

/** Contatados is a staff-operated recovery metric — hide it on the lojista funnel. */
export function merchantVisibleFunnelSteps(
  funnel: MerchantFunnelInput,
): MerchantFunnelStep[] {
  return [
    { label: 'Interessados', value: funnel.interested },
    { label: 'Checkouts', value: funnel.checkoutsSent },
    { label: 'Pagos', value: funnel.checkoutsPaid, emphasis: true },
  ];
}
