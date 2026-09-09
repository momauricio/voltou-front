'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  getFulfillmentSettings,
  getMercadoPagoConnection,
  getStoreRules,
  listApiCustomers,
  listApiProducts,
  resolveTenantContext,
} from '@/lib/api';
import { lojistaApiLoadError } from '@/lib/lojista-panel-ux';
import {
  evaluateOnboarding,
  type OnboardingSnapshot,
} from '@/lib/lojista-onboarding';

export function useOnboardingSnapshot() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const ctx = await resolveTenantContext();
    if (!ctx.tenantId || !ctx.storeId) {
      setSnapshot(null);
      setError(lojistaApiLoadError());
      setLoading(false);
      return;
    }

    try {
      const [customers, products, mp, fulfillment, storeRules] = await Promise.all([
        listApiCustomers(ctx.tenantId, ctx.storeId).catch(() => []),
        listApiProducts(ctx.tenantId, ctx.storeId).catch(() => []),
        getMercadoPagoConnection(ctx.tenantId, ctx.storeId).catch(() => ({
          connected: false,
        })),
        getFulfillmentSettings(ctx.tenantId, ctx.storeId).catch(() => ({
          pickupAddressText: null,
          orderNotifyPhoneE164: null,
        })),
        getStoreRules(ctx.tenantId, ctx.storeId).catch(() => ({
          rules: null,
          updatedAt: null,
        })),
      ]);

      const rules = storeRules.rules;
      setSnapshot(
        evaluateOnboarding({
          customerCount: customers.length,
          productCount: products.length,
          rulesUpdatedAt: storeRules.updatedAt,
          descontoPadrao: rules?.descontoPadrao,
          margemMaxima: rules?.margemMaxima,
          maxDescontoUmProduto: rules?.maxDescontoUmProduto,
          maxDescontoDoisOuMais: rules?.maxDescontoDoisOuMais,
          mercadoPagoConnected: Boolean(mp.connected),
          pickupAddressText: fulfillment.pickupAddressText,
          orderNotifyPhoneE164: fulfillment.orderNotifyPhoneE164,
        }),
      );
      setError(null);
    } catch (err) {
      setSnapshot(null);
      setError(lojistaApiLoadError(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload, pathname]);

  return { snapshot, loading, error, reload };
}
