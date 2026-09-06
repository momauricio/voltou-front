/** Home-delivery tracking is free text. No carrier names or tracking URLs. */

export const TRACKING_CODE_MAX = 120;

const HOME_DELIVERY = new Set(['delivery', 'home', 'entrega']);

export function orderAllowsTrackingCode(
  fulfillmentMethod?: string | null,
): boolean {
  const method = fulfillmentMethod?.trim().toLowerCase();
  return Boolean(method && HOME_DELIVERY.has(method));
}

export function normalizeTrackingCode(
  value?: string | null,
): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, TRACKING_CODE_MAX);
}

export function buildOrderFulfillmentPatchBody(payload: {
  tenantId: string;
  storeId: string;
  status?: 'ready' | 'shipped' | 'done';
  trackingCode?: string | null;
}) {
  return {
    tenantId: payload.tenantId,
    storeId: payload.storeId,
    ...(payload.status != null ? { status: payload.status } : {}),
    ...(payload.trackingCode !== undefined
      ? { trackingCode: payload.trackingCode }
      : {}),
  };
}

/** Tracking-only PATCH: never includes fulfillment status. */
export function buildOrderTrackingPatchBody(payload: {
  tenantId: string;
  storeId: string;
  trackingCode: string | null;
}) {
  return buildOrderFulfillmentPatchBody({
    tenantId: payload.tenantId,
    storeId: payload.storeId,
    trackingCode: payload.trackingCode,
  });
}
