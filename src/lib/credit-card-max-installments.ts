/**
 * Max credit-card installments the Payment Brick may advertise.
 *
 * Payment Brick shows the chip “Parcelamento disponível” whenever
 * `customization.paymentMethods.maxInstallments` is > 1, even if the
 * amount cannot actually be split. Mercado Pago typically requires
 * ~R$ 5 per parcela, so R$ 5 is 1x only — the selector never appears.
 */
export const MP_MIN_INSTALLMENT_CENTS = 500;
export const MP_MAX_INSTALLMENTS = 12;

export function creditCardMaxInstallments(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 1;
  return Math.min(
    MP_MAX_INSTALLMENTS,
    Math.max(1, Math.floor(amountCents / MP_MIN_INSTALLMENT_CENTS)),
  );
}
