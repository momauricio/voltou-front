/** Home-delivery tracking is free text. No carrier names or tracking URLs. */

export function orderAllowsTrackingCode(
  fulfillmentMethod?: string | null,
): boolean {
  return fulfillmentMethod === 'delivery';
}

export function normalizeTrackingCode(
  value?: string | null,
): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}
