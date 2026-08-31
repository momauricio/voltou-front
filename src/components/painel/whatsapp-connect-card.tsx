'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/painel/modal';
import { StatusBadge } from '@/components/painel/status-badge';
import {
  createWhatsappSession,
  deleteWhatsappConnection,
  disconnectWhatsappSession,
  getWhatsappQr,
  getWhatsappSession,
  listWhatsappConnections,
  resolveTenantContext,
  type WhatsappConnection,
} from '@/lib/api';

type UiStatus = 'Conectado' | 'Aguardando' | 'Desconectado';

const STATUS_TONE: Record<UiStatus, 'success' | 'warning' | 'danger'> = {
  Conectado: 'success',
  Aguardando: 'warning',
  Desconectado: 'danger',
};

const STATUS_HINT: Record<UiStatus, string> = {
  Conectado: 'Enviando e recebendo mensagens normalmente.',
  Aguardando: 'Escaneie o QR no WhatsApp do celular para concluir a conexão.',
  Desconectado: 'Reconecte esse número para a loja voltar a conversar no WhatsApp.',
};

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

export function WhatsappConnectCard() {
  const [conexoes, setConexoes] = useState<WhatsappConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [apelido, setApelido] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'qr' | 'done'>('form');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveTenantContext().then((ctx) => {
      if (cancelled) return;
      setTenantId(ctx.tenantId);
      setStoreId(ctx.storeId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshList = useCallback(async () => {
    if (!tenantId) {
      setListError(
        'Faça login novamente para carregar as conexões (tenant/loja não encontrados).',
      );
      setLoading(false);
      return;
    }
    try {
      setListError(null);
      const rows = await listWhatsappConnections(tenantId, storeId);
      setConexoes(rows);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : 'Não foi possível listar conexões.',
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, storeId]);

  useEffect(() => {
    if (!tenantId) {
      void resolveTenantContext().then((ctx) => {
        if (!ctx.tenantId) setLoading(false);
      });
      return;
    }
    void refreshList();
    return () => stopPolling();
  }, [tenantId, refreshList, stopPolling]);

  function openConnectModal() {
    stopPolling();
    setApelido('');
    setConnectError(null);
    setActiveSession(null);
    setQrDataUrl(null);
    setPhase('form');
    setModalOpen(true);
  }

  function closeModal() {
    stopPolling();
    setModalOpen(false);
    setConnecting(false);
    setPhase('form');
    void refreshList();
  }

  async function startPolling(sessionName: string) {
    stopPolling();
    if (!tenantId) return;

    const tick = async () => {
      try {
        const [session, qr] = await Promise.all([
          getWhatsappSession(tenantId, sessionName),
          getWhatsappQr(tenantId, sessionName).catch(() => null),
        ]);

        if (qr?.data) {
          const data = qr.data.startsWith('data:')
            ? qr.data
            : `data:${qr.mimetype || 'image/png'};base64,${qr.data}`;
          setQrDataUrl(data);
        }

        if (session.status === 'WORKING') {
          stopPolling();
          setPhase('done');
          setConnecting(false);
          void refreshList();
          return;
        }

        if (session.status === 'FAILED') {
          stopPolling();
          setConnectError(
            'Falha na sessão. Feche e tente conectar novamente.',
          );
          setConnecting(false);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('não configurado')) {
          stopPolling();
          setConnectError(err.message);
          setConnecting(false);
        }
      }
    };

    await tick();
    pollRef.current = setInterval(() => {
      void tick();
    }, 2000);
  }

  async function handleConectar(e: FormEvent) {
    e.preventDefault();
    if (!apelido.trim()) return;
    if (!tenantId || !storeId) {
      setConnectError(
        'Faça login novamente. É necessário tenantId e storeId para criar a sessão.',
      );
      return;
    }

    setConnecting(true);
    setConnectError(null);

    try {
      const created = await createWhatsappSession({
        tenantId,
        storeId,
        label: apelido.trim(),
      });
      setActiveSession(created.sessionName);
      setPhase('qr');
      await startPolling(created.sessionName);
    } catch (err) {
      setConnecting(false);
      setConnectError(
        err instanceof Error ? err.message : 'Não foi possível criar a sessão.',
      );
    }
  }

  async function handleDisconnect(sessionName: string) {
    if (!tenantId) return;
    try {
      await disconnectWhatsappSession(tenantId, sessionName);
      await refreshList();
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : 'Falha ao desconectar.',
      );
    }
  }

  async function handleRemove(id: string) {
    if (!tenantId) return;
    try {
      await deleteWhatsappConnection(tenantId, id);
      await refreshList();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Falha ao remover.');
    }
  }

  return (
    <section
      id="whatsapp"
      className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">WhatsApp</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opcional — conecte o número da loja quando quiser. Não bloqueia a
            configuração nem a primeira venda.
          </p>
        </div>
        <button
          type="button"
          onClick={openConnectModal}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Conectar WhatsApp
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Ao conectar, um QR code aparece para você escanear em WhatsApp →
        Aparelhos conectados. A conexão fica vinculada à sua loja.
      </p>

      {listError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {listError}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando conexões…</p>
      ) : conexoes.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Nenhum WhatsApp conectado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clique em Conectar WhatsApp e escaneie o QR com o celular da loja.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {conexoes.map((c) => {
            const uiStatus = c.uiStatus;
            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-xl border border-border p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{c.label}</p>
                    <StatusBadge label={uiStatus} tone={STATUS_TONE[uiStatus]} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.phoneE164 || 'Número a definir'}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {STATUS_HINT[uiStatus]}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  {uiStatus === 'Conectado' ? (
                    <button
                      type="button"
                      onClick={() => void handleDisconnect(c.sessionName)}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      Desconectar
                    </button>
                  ) : uiStatus === 'Aguardando' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSession(c.sessionName);
                        setPhase('qr');
                        setModalOpen(true);
                        setConnecting(true);
                        void startPolling(c.sessionName);
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      Ver QR
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      Reconectar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRemove(c.id)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                    title="Remover número"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Conectar WhatsApp"
        description={
          phase === 'qr'
            ? 'Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho.'
            : phase === 'done'
              ? 'Número conectado com sucesso.'
              : 'Informe um apelido e escaneie o QR no celular.'
        }
      >
        {phase === 'form' && (
          <form onSubmit={handleConectar} className="space-y-4">
            <div>
              <label htmlFor="apelido" className="text-sm font-medium text-foreground">
                Apelido do número
              </label>
              <input
                id="apelido"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Ex: Loja Principal"
                className={fieldClass}
                required
              />
            </div>
            {connectError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {connectError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={connecting}
                className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
              >
                {connecting ? 'Criando sessão…' : 'Gerar QR'}
              </button>
            </div>
          </form>
        )}

        {phase === 'qr' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR Code WhatsApp"
                  className="h-56 w-56 rounded-lg bg-white p-2"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-lg bg-white text-sm text-muted-foreground">
                  Carregando QR…
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Sessão: <span className="font-mono">{activeSession}</span>
                <br />
                O QR atualiza automaticamente a cada poucos segundos.
              </p>
            </div>
            {connectError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {connectError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4">
            <p className="rounded-xl border border-border bg-accent/50 px-3 py-2 text-sm text-foreground">
              WhatsApp da loja conectado. As conversas saem deste número.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
