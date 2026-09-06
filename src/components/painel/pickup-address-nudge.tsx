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
        getFulfillmentSettings(ctx.tenantId, ctx.storeId).catch(() => null),
        listMerchantOrders(ctx.tenantId, ctx.storeId).catch(() => []),
      ]);
      const items = orders ?? [];
      if (settings) {
        setVisible(
          shouldNudgeEmptyPickupAddress({
            pickupAddressText: settings.pickupAddressText,
            items,
          }),
        );
        return;
      }
      setVisible(items.some((order) => order.fulfillmentMethod === 'pickup'));
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
        onClick={(event) => {
          if (typeof window === 'undefined') return;
          if (!window.location.pathname.startsWith('/painel/regras')) return;
          event.preventDefault();
          const field = document.getElementById('fulfillmentPickup');
          field?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          field?.focus();
        }}
      >
        {PICKUP_ADDRESS_NUDGE_CTA}
      </Link>
    </div>
  );
}
