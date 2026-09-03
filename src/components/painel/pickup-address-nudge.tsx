'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getFulfillmentSettings,
  listMerchantOrders,
  resolveTenantContext,
} from '@/lib/api';
import {
  PICKUP_ADDRESS_CHANGED_EVENT,
  PICKUP_ADDRESS_NUDGE_CTA,
  PICKUP_ADDRESS_NUDGE_HREF,
  PICKUP_ADDRESS_NUDGE_MESSAGE,
  shouldNudgeEmptyPickupAddress,
} from '@/lib/lojista-panel-ux';

export function PickupAddressNudge() {
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(async () => {
    const ctx = await resolveTenantContext();
    if (!ctx.tenantId || !ctx.storeId) {
      setVisible(false);
      return;
    }
    try {
      const [settings, orders] = await Promise.all([
        getFulfillmentSettings(ctx.tenantId, ctx.storeId),
        listMerchantOrders(ctx.tenantId, ctx.storeId),
      ]);
      setVisible(
        shouldNudgeEmptyPickupAddress({
          pickupAddressText: settings.pickupAddressText,
          items: orders,
        }),
      );
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(PICKUP_ADDRESS_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(PICKUP_ADDRESS_CHANGED_EVENT, onChanged);
    };
  }, [refresh]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p>{PICKUP_ADDRESS_NUDGE_MESSAGE}</p>
      <Link
        href={PICKUP_ADDRESS_NUDGE_HREF}
        className="mt-2 inline-flex font-semibold underline underline-offset-2"
      >
        {PICKUP_ADDRESS_NUDGE_CTA}
      </Link>
    </div>
  );
}
