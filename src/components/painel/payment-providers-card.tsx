'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  disconnectMercadoPago,
  getMercadoPagoAuthorizeUrl,
  getMercadoPagoConnection,
  resolveTenantContext,
  type MercadoPagoConnection,
} from '@/lib/api';
import { StatusBadge } from '@/components/painel/status-badge';
import { safeExternalRedirect } from '@/lib/safe-redirect';

export function PaymentProvidersCard() {
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [connection, setConnection] = useState<MercadoPagoConnection | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasSession = Boolean(tenantId && storeId);
  const notConfigured = connection?.configured === false;

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
    try {
      setError(null);
      setConnection(await getMercadoPagoConnection(tenantId, storeId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o Mercado Pago.',
      );
    }
  }, [tenantId, storeId]);

  useEffect(() => {
    if (!sessionReady || !hasSession) return;
    void refresh();
  }, [sessionReady, hasSession, refresh]);

  useEffect(() => {
    const flag = searchParams.get('mp');
    if (flag === 'connected') {
      setNotice('Mercado Pago conectado com sucesso.');
      void refresh();
    } else if (flag === 'error') {
      setError(
        searchParams.get('msg') ||
          'Não foi possível concluir a autorização do Mercado Pago.',
      );
    }
  }, [searchParams, refresh]);

  async function handleConnect() {
    if (!tenantId || !storeId) return;
    if (notConfigured) {
      setError(
        'Configure MP_CLIENT_ID e MP_CLIENT_SECRET no .env da API e reinicie o servidor.',
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { url } = await getMercadoPagoAuthorizeUrl(tenantId, storeId);
      safeExternalRedirect(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao iniciar OAuth do Mercado Pago.',
      );
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!tenantId || !storeId) return;
    if (!window.confirm('Desconectar o Mercado Pago desta loja?')) return;
    setBusy(true);
    try {
      await disconnectMercadoPago(tenantId, storeId);
      setNotice('Mercado Pago desconectado.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desconectar.');
    } finally {
      setBusy(false);
    }
  }

  const connected = connection?.connected === true;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="text-base font-semibold text-foreground">
        Pagamentos e comissão
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Conecte o provedor onde a loja recebe. A Voltou retém a comissão no
        split; o restante cai direto na conta do lojista.
      </p>

      <div className="mt-5 space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">Mercado Pago</p>
              {connected ? (
                <StatusBadge label="Conectado" tone="success" />
              ) : notConfigured ? (
                <StatusBadge label="API sem credenciais" tone="warning" />
              ) : (
                <StatusBadge label="Desconectado" tone="muted" />
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Split automático (Pix, cartão, boleto). Ideal para o link da IA.
            </p>
            {connected && connection?.accountLabel && (
              <p className="mt-1 text-xs text-muted-foreground">
                Conta: {connection.accountLabel}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {sessionReady && !hasSession && (
              <Link
                href="/entrar"
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted"
              >
                Entrar
              </Link>
            )}
            {hasSession && !connected && (
              <button
                type="button"
                disabled={busy || notConfigured}
                onClick={() => void handleConnect()}
                className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
              >
                {busy ? 'Abrindo…' : 'Conectar'}
              </button>
            )}
            {hasSession && connected && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDisconnect()}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">InfinitePay</p>
              <StatusBadge label="Em breve" tone="muted" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Outros provedores entram pela mesma interface — ainda não
              disponível.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex h-10 cursor-not-allowed items-center rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground opacity-60"
          >
            Em breve
          </button>
        </div>
      </div>

      {notConfigured && hasSession && (
        <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
          <p className="font-medium">
            O login no Mercado Pago não abre porque a API está sem credenciais.
          </p>
          <p>
            Preencha <code className="rounded bg-amber-100 px-1">MP_CLIENT_ID</code> e{' '}
            <code className="rounded bg-amber-100 px-1">MP_CLIENT_SECRET</code> no{' '}
            <code className="rounded bg-amber-100 px-1">.env</code> da API na VPS e
            reinicie o container.
          </p>
        </div>
      )}
      {notice && (
        <p className="mt-3 rounded-xl border border-border bg-accent/50 px-3 py-2 text-sm text-foreground">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
