'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/painel/page-header';
import { Modal } from '@/components/painel/modal';
import { StatusBadge } from '@/components/painel/status-badge';
import {
  approveAllOutreach,
  approveOutreachMessage,
  createCampaign,
  getSegments,
  listCampaigns,
  listOutreachMessages,
  rejectOutreachMessage,
  resolveTenantContext,
  type ApiCampaign,
  type OutreachMessage,
  type SegmentId,
  type SegmentsResult,
} from '@/lib/api';

const SEGMENT_OPTIONS: { id: SegmentId | 'todos'; label: string }[] = [
  { id: 'checkout_pendente', label: 'Checkout pendente' },
  { id: 'interesse_aberto', label: 'Interesse aberto' },
  { id: 'inativos', label: 'Sumidos (follow-up)' },
  { id: 'sem_compra', label: 'Nunca compraram' },
  { id: 'todos', label: 'Todos elegíveis' },
];

export default function CampanhasPage() {
  const [tenantCtx, setTenantCtx] = useState<{
    tenantId: string;
    storeId: string;
  } | null>(null);
  const [segments, setSegments] = useState<SegmentsResult | null>(null);
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [queue, setQueue] = useState<OutreachMessage[]>([]);
  const [sendingQueue, setSendingQueue] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [segment, setSegment] = useState<SegmentId | 'todos'>('inativos');
  const [mensagem, setMensagem] = useState(
    'Oi {{nome}}! Sentimos sua falta na loja. Temos novidades em {{produto}} — posso te ajudar?',
  );
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  async function reload(tenantId: string, storeId: string) {
    const [seg, camps, pending, approved] = await Promise.all([
      getSegments(tenantId, storeId),
      listCampaigns(tenantId, storeId),
      listOutreachMessages(tenantId, storeId, 'pending_approval'),
      listOutreachMessages(tenantId, storeId, 'approved'),
    ]);
    setSegments(seg);
    setCampaigns(camps);
    setQueue(pending);
    setSendingQueue(approved);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const ctx = await resolveTenantContext();
      if (cancelled) return;
      if (!ctx.tenantId || !ctx.storeId) {
        setErro('Entre na conta da loja para ver segmentos e a fila de aprovação.');
        setLoading(false);
        return;
      }
      setTenantCtx({ tenantId: ctx.tenantId, storeId: ctx.storeId });
      try {
        await reload(ctx.tenantId, ctx.storeId);
        setErro(null);
      } catch (err) {
        setErro(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar campanhas.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const readyBySegment = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of segments?.customers ?? []) {
      if (!c.readyToContact) continue;
      map.set(c.segment, (map.get(c.segment) ?? 0) + 1);
    }
    return map;
  }, [segments]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!tenantCtx || !nome.trim() || !mensagem.trim()) return;
    setCreating(true);
    setResultMsg(null);
    try {
      const created = await createCampaign({
        tenantId: tenantCtx.tenantId,
        storeId: tenantCtx.storeId,
        name: nome.trim(),
        segment,
        messageTemplate: mensagem.trim(),
      });
      setResultMsg(
        `Campanha criada com ${created.messagesCreated} mensagem(ns) na fila de aprovação.`,
      );
      setModalOpen(false);
      setNome('');
      await reload(tenantCtx.tenantId, tenantCtx.storeId);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Erro ao criar campanha.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleApprove(id: string) {
    if (!tenantCtx) return;
    setActionBusy(id);
    try {
      await approveOutreachMessage(tenantCtx.tenantId, id);
      await reload(tenantCtx.tenantId, tenantCtx.storeId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao aprovar.');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleReject(id: string) {
    if (!tenantCtx) return;
    setActionBusy(id);
    try {
      await rejectOutreachMessage(tenantCtx.tenantId, id);
      await reload(tenantCtx.tenantId, tenantCtx.storeId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao rejeitar.');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApproveAll() {
    if (!tenantCtx) return;
    setActionBusy('all');
    try {
      const res = await approveAllOutreach(
        tenantCtx.tenantId,
        tenantCtx.storeId,
      );
      setResultMsg(`${res.approved} mensagem(ns) aprovada(s) para envio.`);
      await reload(tenantCtx.tenantId, tenantCtx.storeId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao aprovar.');
    } finally {
      setActionBusy(null);
    }
  }

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        subtitle="Disparos e venda ativa com aprovação humana. Regras ficam para a recuperação automática."
        actions={
          <button
            type="button"
            disabled={!tenantCtx}
            onClick={() => {
              setResultMsg(null);
              setModalOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
          >
            Novo disparo
          </button>
        }
      />

      {resultMsg && (
        <p className="rounded-2xl border border-border bg-accent/50 px-4 py-3 text-sm text-foreground">
          {resultMsg}
        </p>
      )}

      {erro && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {erro}{' '}
          <Link href="/entrar" className="font-medium underline">
            Entrar
          </Link>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(segments?.segments ?? []).map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{s.count}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                <p className="mt-2 text-xs text-primary">
                  {readyBySegment.get(s.id) ?? 0} prontos pra disparar
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Fila de aprovação
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {queue.length} mensagem(ns) aguardando revisão ·{' '}
                  {segments?.readyToContact ?? 0} clientes elegíveis no total
                </p>
              </div>
              {queue.length > 0 && (
                <button
                  type="button"
                  disabled={actionBusy === 'all'}
                  onClick={() => void handleApproveAll()}
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
                >
                  Aprovar todas
                </button>
              )}
            </div>

            <div className="mt-4 divide-y divide-border">
              {queue.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma mensagem aguardando aprovação.
                </p>
              )}
              {queue.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {m.customer.displayName}
                      </p>
                      <StatusBadge label={m.campaign.name} tone="muted" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.customer.phoneMasked ?? '—'}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {m.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={actionBusy === m.id}
                      onClick={() => void handleApprove(m.id)}
                      className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy === m.id}
                      onClick={() => void handleReject(m.id)}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Fila de envio
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {sendingQueue.length} aprovada(s) · o agendador envia no horário das{' '}
                <Link href="/painel/regras" className="font-medium text-primary underline">
                  Regras
                </Link>{' '}
                (padrão 09h–20h), a cada ~1 min.
              </p>
            </div>
            <div className="mt-4 divide-y divide-border">
              {sendingQueue.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma mensagem aprovada aguardando envio.
                </p>
              )}
              {sendingQueue.map((m) => (
                <div key={m.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {m.customer.displayName}
                    </p>
                    <StatusBadge label="Aguardando horário" tone="warning" />
                    <StatusBadge label={m.campaign.name} tone="muted" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.customer.phoneMasked ?? '—'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-semibold text-foreground">Campanhas recentes</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Segmento</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Aprovar</th>
                    <th className="pb-2 font-medium">Enviar</th>
                    <th className="pb-2 font-medium">Enviadas</th>
                    <th className="pb-2 font-medium">Respostas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhuma campanha ainda.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 font-medium text-foreground">{c.name}</td>
                        <td className="py-2.5 text-muted-foreground">
                          {c.segment ?? '—'}
                        </td>
                        <td className="py-2.5 text-muted-foreground">{c.status}</td>
                        <td className="py-2.5 text-muted-foreground">
                          {c.counts.pendingApproval}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {c.counts.approved}
                        </td>
                        <td className="py-2.5 text-muted-foreground">{c.counts.sent}</td>
                        <td className="py-2.5 font-medium text-primary">
                          {c.counts.replied}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo disparo"
        description="Gera mensagens na fila de aprovação. Depois de aprovar, o envio respeita o horário das Regras (recuperação automática fica em Regras)."
      >
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <div>
            <label htmlFor="campNome" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="campNome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label htmlFor="campSeg" className="text-sm font-medium text-foreground">
              Segmento
            </label>
            <select
              id="campSeg"
              value={segment}
              onChange={(e) => setSegment(e.target.value as SegmentId | 'todos')}
              className={fieldClass}
            >
              {SEGMENT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                  {opt.id !== 'todos'
                    ? ` (${readyBySegment.get(opt.id) ?? 0} elegíveis)`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="campMsg" className="text-sm font-medium text-foreground">
              Mensagem
            </label>
            <textarea
              id="campMsg"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
              className={fieldClass}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use {'{{nome}}'}, {'{{produto}}'} e {'{{link}}'} (cupom /loja/… se o
              cliente já tiver checkout pendente).
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {creating ? 'Criando…' : 'Gerar fila'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
