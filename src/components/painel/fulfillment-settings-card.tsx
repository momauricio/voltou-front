'use client';

import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import Link from 'next/link';
import {
  getFulfillmentSettings,
  resolveTenantContext,
  updateFulfillmentSettings,
  type StoreFulfillmentSettings,
} from '@/lib/api';
import {
  BR_MOBILE_NATIONAL_PLACEHOLDER,
  e164ToBrMobileNational,
  formatBrMobileNational,
  validateFulfillmentMerchantForm,
  type FulfillmentMerchantFormErrors,
} from '@/lib/br-mobile-national';
import { notifyPickupAddressChanged } from '@/lib/lojista-panel-ux';

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

const fieldErrorClass =
  'mt-1.5 w-full rounded-xl border border-red-300 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20';

function centsToReaisInput(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2).replace('.', ',');
}

function reaisInputToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) return 0;
  const normalized = trimmed.replace(',', '.');
  const value = Number(normalized);
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}

export type FulfillmentSettingsCardHandle = {
  save: () => Promise<boolean>;
};

export const FulfillmentSettingsCard = forwardRef<
  FulfillmentSettingsCardHandle
>(function FulfillmentSettingsCard(_props, ref) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [shippingReais, setShippingReais] = useState('0,00');
  const [pickupAddressText, setPickupAddressText] = useState('');
  const [orderNotifyPhone, setOrderNotifyPhone] = useState('');
  const [savedNotifyPhone, setSavedNotifyPhone] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FulfillmentMerchantFormErrors>(
    {},
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const hasSession = Boolean(tenantId && storeId);
  const showNotifyBanner = !savedNotifyPhone?.trim() && !orderNotifyPhone.trim();

  const applySettings = useCallback((data: StoreFulfillmentSettings) => {
    setDeliveryEnabled(data.deliveryEnabled);
    setShippingReais(centsToReaisInput(data.shippingCents));
    setPickupAddressText(data.pickupAddressText ?? '');
    setOrderNotifyPhone(e164ToBrMobileNational(data.orderNotifyPhoneE164));
    setSavedNotifyPhone(data.orderNotifyPhoneE164);
    setFieldErrors({});
  }, []);

  useEffect(() => {
    let cancelled = false;
    void resolveTenantContext().then((ctx) => {
      if (cancelled) return;
      setTenantId(ctx.tenantId);
      setStoreId(ctx.storeId);
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!tenantId || !storeId) return;
    setLoading(true);
    setError(null);
    try {
      applySettings(await getFulfillmentSettings(tenantId, storeId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as configurações de entrega.',
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, storeId, applySettings]);

  useEffect(() => {
    if (!sessionReady || !hasSession) return;
    void refresh();
  }, [sessionReady, hasSession, refresh]);

  const saveFulfillment = useCallback(async (): Promise<boolean> => {
    setOk(null);
    if (!tenantId || !storeId) {
      setError('Faça login para salvar as configurações de entrega.');
      return false;
    }

    const shippingCents = reaisInputToCents(shippingReais);
    if (shippingCents === null) {
      setError('Informe um valor de frete válido (R$).');
      return false;
    }

    const parsed = validateFulfillmentMerchantForm({
      pickupAddressText,
      orderNotifyPhone,
    });
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      setError(null);
      return false;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const saved = await updateFulfillmentSettings({
        tenantId,
        storeId,
        deliveryEnabled,
        shippingCents,
        pickupAddressText: parsed.pickupAddressText,
        orderNotifyPhoneE164: parsed.orderNotifyPhoneE164,
      });
      applySettings(saved);
      notifyPickupAddressChanged();
      setOk('Configurações de entrega salvas.');
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao salvar configurações de entrega.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    tenantId,
    storeId,
    shippingReais,
    pickupAddressText,
    orderNotifyPhone,
    deliveryEnabled,
    applySettings,
  ]);

  useImperativeHandle(ref, () => ({ save: saveFulfillment }), [saveFulfillment]);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="text-base font-semibold text-foreground">
        Entrega e pedidos
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Frete fixo, endereço de retirada e WhatsApp para avisos quando um pedido
        for pago.
      </p>

      {!sessionReady ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      ) : !hasSession ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Link href="/entrar" className="font-medium underline">
            Entre na conta
          </Link>{' '}
          para configurar entrega e avisos de pedido.
        </p>
      ) : null}

      {showNotifyBanner && hasSession && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pedidos pagos já aparecem em Pedidos. Cadastre um WhatsApp de aviso
          para receber alerta no celular a cada venda.
        </p>
      )}

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5">
          <div>
            <p className="text-sm font-medium text-foreground">
              Entrega em casa
            </p>
            <p className="text-xs text-muted-foreground">
              Quando desligado, o cliente só pode retirar na loja.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={deliveryEnabled}
            aria-label="Entrega em casa"
            disabled={loading || saving || !hasSession}
            onClick={() => setDeliveryEnabled((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
              deliveryEnabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition ${
                deliveryEnabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div>
          <label htmlFor="fulfillmentShipping" className="text-sm font-medium">
            Frete fixo (R$)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <input
              id="fulfillmentShipping"
              type="text"
              inputMode="decimal"
              value={shippingReais}
              onChange={(e) => setShippingReais(e.target.value)}
              placeholder="0,00"
              className={`${fieldClass} pl-10`}
              disabled={loading || saving || !hasSession || !deliveryEnabled}
            />
          </div>
          {!deliveryEnabled && (
            <p className="mt-1 text-xs text-muted-foreground">
              Frete só se aplica quando a entrega em casa estiver ligada.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="fulfillmentPickup" className="text-sm font-medium">
            Endereço de retirada{' '}
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            id="fulfillmentPickup"
            value={pickupAddressText}
            onChange={(e) => {
              setPickupAddressText(e.target.value);
              setFieldErrors((prev) => ({ ...prev, pickupAddressText: undefined }));
              setError(null);
              setOk(null);
            }}
            rows={3}
            maxLength={500}
            placeholder="Ex.: Rua Exemplo, 100 — Centro — São Paulo/SP"
            className={`${fieldErrors.pickupAddressText ? fieldErrorClass : fieldClass} resize-none`}
            disabled={loading || saving || !hasSession}
            required
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.pickupAddressText)}
            aria-describedby={
              fieldErrors.pickupAddressText ? 'fulfillmentPickup-error' : undefined
            }
          />
          {fieldErrors.pickupAddressText ? (
            <p
              id="fulfillmentPickup-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-700"
            >
              {fieldErrors.pickupAddressText}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="fulfillmentNotifyPhone" className="text-sm font-medium">
            WhatsApp para avisos de pedido{' '}
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="fulfillmentNotifyPhone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={orderNotifyPhone}
            onChange={(e) => {
              setOrderNotifyPhone(formatBrMobileNational(e.target.value));
              setFieldErrors((prev) => ({ ...prev, orderNotifyPhone: undefined }));
              setError(null);
              setOk(null);
            }}
            placeholder={BR_MOBILE_NATIONAL_PLACEHOLDER}
            className={fieldErrors.orderNotifyPhone ? fieldErrorClass : fieldClass}
            disabled={loading || saving || !hasSession}
            required
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.orderNotifyPhone)}
            aria-describedby={
              fieldErrors.orderNotifyPhone
                ? 'fulfillmentNotifyPhone-error fulfillmentNotifyPhone-hint'
                : 'fulfillmentNotifyPhone-hint'
            }
          />
          {fieldErrors.orderNotifyPhone ? (
            <p
              id="fulfillmentNotifyPhone-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-700"
            >
              {fieldErrors.orderNotifyPhone}
            </p>
          ) : null}
          <p
            id="fulfillmentNotifyPhone-hint"
            className="mt-1.5 text-xs text-muted-foreground"
          >
            Celular com DDD. Diferente do WhatsApp conectado para falar com
            clientes.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {ok && (
          <p className="rounded-xl border border-border bg-accent/50 px-3 py-2 text-sm text-foreground">
            {ok}
          </p>
        )}
      </div>
    </section>
  );
});
