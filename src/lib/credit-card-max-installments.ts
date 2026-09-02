/**
 * Max credit-card installments the Payment Brick may advertise.
 *
 * Payment Brick shows the chip “Parcelamento disponível” whenever
 * `customization.paymentMethods.maxInstallments` is > 1, even if the
 * amount cannot actually be split. Mercado Pago typically requires
 * ~R$ 5 per parcela, so R$ 5 / R$ 9,99 are 1x only — the selector
 * never appears. Pass the real max (1..12); never hardcode 12.
 */
export const MP_MIN_INSTALLMENT_CENTS = 500;
export const MP_MAX_INSTALLMENTS = 12;

export const CREDIT_CARD_AVISTA_NOTICE =
  'Pagamento à vista — abaixo do mínimo de parcela (R$ 5,00 por parcela).';

export function creditCardMaxInstallments(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 1;
  return Math.min(
    MP_MAX_INSTALLMENTS,
    Math.max(1, Math.floor(amountCents / MP_MIN_INSTALLMENT_CENTS)),
  );
}
