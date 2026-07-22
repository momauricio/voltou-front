'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckoutPreview } from '@/components/checkout/checkout-preview';
import {
  CHECKOUT_FONT_OPTIONS,
  type CheckoutFontId,
} from '@/lib/checkout-branding';
import {
  getCheckoutBranding,
  resolveTenantContext,
  updateCheckoutBranding,
  type StoreCheckoutBranding,
} from '@/lib/api';

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

const DEFAULTS = {
  logoUrl: '',
  primaryColor: '#0F766E',
  secondaryColor: '#F0FDFA',
  fontFamily: 'geist' as CheckoutFontId,
  message: '',
};

export function CheckoutBrandingCard() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [storeName, setStoreName] = useState('Sua loja');
  const [logoUrl, setLogoUrl] = useState(DEFAULTS.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(DEFAULTS.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULTS.secondaryColor);
  const [fontFamily, setFontFamily] = useState<CheckoutFontId>(
    DEFAULTS.fontFamily,
  );
  const [message, setMessage] = useState(DEFAULTS.message);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const hasSession = Boolean(tenantId && storeId);

  const applyBranding = useCallback((data: StoreCheckoutBranding) => {
    setStoreName(data.storeName);
    setLogoUrl(data.logoUrl ?? '');
    setPrimaryColor(data.primaryColor ?? DEFAULTS.primaryColor);
    setSecondaryColor(data.secondaryColor ?? DEFAULTS.secondaryColor);
    setFontFamily((data.fontFamily as CheckoutFontId) || DEFAULTS.fontFamily);
    setMessage(data.message ?? '');
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
      applyBranding(await getCheckoutBranding(tenantId, storeId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a personalização.',
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, storeId, applyBranding]);

  useEffect(() => {
    if (!sessionReady || !hasSession) return;
    void refresh();
  }, [sessionReady, hasSession, refresh]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    if (!tenantId || !storeId) {
      setError('Faça login para salvar a personalização na loja.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await updateCheckoutBranding({
        tenantId,
        storeId,
        logoUrl: logoUrl.trim() || null,
        primaryColor,
        secondaryColor,
        fontFamily,
        message: message.trim() || null,
      });
      applyBranding(saved);
      setOk('Personalização salva. O preview reflete o checkout real.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Falha ao salvar personalização.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="text-base font-semibold text-foreground">
        Aparência do checkout
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Logo, cores e tipografia da página `/p/…` que o cliente abre antes de
        pagar no Mercado Pago. O preview atualiza na hora.
      </p>

      {!sessionReady ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      ) : !hasSession ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Você pode testar o visual abaixo.{' '}
          <Link href="/entrar" className="font-medium underline">
            Entre na conta
          </Link>{' '}
          para salvar na loja.
        </p>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="checkoutLogo" className="text-sm font-medium">
              Logo da loja (URL)
            </label>
            <input
              id="checkoutLogo"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className={fieldClass}
              disabled={loading || saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="checkoutPrimary" className="text-sm font-medium">
                Cor principal
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="checkoutPrimary"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
                  disabled={loading || saving}
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className={`${fieldClass} mt-0`}
                  disabled={loading || saving}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="checkoutSecondary"
                className="text-sm font-medium"
              >
                Cor secundária
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="checkoutSecondary"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
                  disabled={loading || saving}
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className={`${fieldClass} mt-0`}
                  disabled={loading || saving}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="checkoutFont" className="text-sm font-medium">
              Tipografia
            </label>
            <select
              id="checkoutFont"
              value={fontFamily}
              onChange={(e) =>
                setFontFamily(e.target.value as CheckoutFontId)
              }
              className={fieldClass}
              disabled={loading || saving}
            >
              {CHECKOUT_FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="checkoutMessage" className="text-sm font-medium">
              Mensagem curta (opcional)
            </label>
            <textarea
              id="checkoutMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="Ex.: Obrigado por comprar conosco!"
              className={`${fieldClass} resize-none`}
              disabled={loading || saving}
            />
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

          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar personalização'}
          </button>
        </form>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Preview</p>
          <CheckoutPreview
            compact
            storeName={storeName}
            productName="Produto exemplo"
            amountCents={12990}
            branding={{
              logoUrl: logoUrl.trim() || null,
              primaryColor,
              secondaryColor,
              fontFamily,
              message: message.trim() || null,
            }}
            status="preview"
          />
        </div>
      </div>
    </section>
  );
}
