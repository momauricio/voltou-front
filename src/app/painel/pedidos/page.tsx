'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/painel/page-header';
import { StatusBadge } from '@/components/painel/status-badge';
import {
  listMerchantOrders,
  resolveTenantContext,
  updateOrderFulfillment,
  type MerchantOrder,
} from '@/lib/api';

type FulfillmentFilter = 'todos' | 'awaiting' | 'ready' | 'shipped' | 'done';
type FulfillmentAction = 'ready' | 'shipped' | 'done';

const FILTERS: { id: FulfillmentFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'awaiting', label: 'Aguardando' },
  { id: 'ready', label: 'Pronto' },
  { id: 'shipped', label: 'Enviado' },
  { id: 'done', label: 'Concluído' },
];

const STATUS_LABEL: Record<string, string> = {
  awaiting: 'Aguardando',
  ready: 'Pronto',
  shipped: 'Enviado',
  done: 'Concluído',
};

const STATUS_TONE: Record<string, 'success' | 'warning' | 'muted' | 'danger'> = {
  awaiting: 'warning',
  ready: 'muted',
  shipped: 'muted',
  done: 'success',
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatPaidAt(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function methodLabel(method: string | null) {
  if (method === 'delivery') return 'Entrega';
  if (method === 'pickup') return 'Retirada';
  return '—';
}

function itemsLabel(order: MerchantOrder) {
  if (order.paidLines?.length) {
    return order.paidLines.map((l) => l.productNameSnapshot).join(', ');
  }
  return order.productName || '—';
}

function formatAddress(order: MerchantOrder) {
  const a = order.shippingAddress;
  if (!a) return null;
  const line = [
    a.street,
    a.number,
    a.complement,
    a.neighborhood,
    `${a.city}/${a.state}`,
    a.cep,
  ]
    .filter(Boolean)
    .join(', ');
  return line;
}

function availableActions(order: MerchantOrder): FulfillmentAction[] {
  const status = order.fulfillmentStatus ?? 'awaiting';
  const method = order.fulfillmentMethod;

  if (status === 'done') return [];
  if (status === 'ready' || status === 'shipped') return ['done'];
  if (status === 'awaiting') {
    if (method === 'pickup') return ['ready', 'done'];
    if (method === 'delivery') return ['shipped', 'done'];
    return ['done'];
  }
  return [];
}

const ACTION_LABEL: Record<FulfillmentAction, string> = {
  ready: 'Pronto',
  shipped: 'Enviado',
  done: 'Concluir',
};

export default function PedidosPage() {
  const [tenantCtx, setTenantCtx] = useState<{
    tenantId: string;
    storeId: string;
  } | null>(null);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [filter, setFilter] = useState<FulfillmentFilter>('todos');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const reload = useCallback(
    async (tenantId: string, storeId: string, statusFilter: FulfillmentFilter) => {
      const list = await listMerchantOrders(
        tenantId,
        storeId,
        statusFilter === 'todos' ? undefined : statusFilter,
      );
      setOrders(list);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ctx = await resolveTenantContext();
      if (cancelled) return;
      if (!ctx.tenantId || !ctx.storeId) {
        setErro('Entre na conta da loja para ver os pedidos.');
        setLoading(false);
        return;
      }
      setTenantCtx({ tenantId: ctx.tenantId, storeId: ctx.storeId });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tenantCtx) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await reload(tenantCtx.tenantId, tenantCtx.storeId, filter);
        if (!cancelled) setErro(null);
      } catch (err) {
        if (!cancelled) {
          setErro(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar os pedidos.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantCtx, filter, reload]);

  async function handleAction(orderId: string, status: FulfillmentAction) {
    if (!tenantCtx) return;
    setActionBusy(`${orderId}:${status}`);
    try {
      await updateOrderFulfillment({
        checkoutId: orderId,
        tenantId: tenantCtx.tenantId,
        storeId: tenantCtx.storeId,
        status,
      });
      await reload(tenantCtx.tenantId, tenantCtx.storeId, filter);
      setErro(null);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Erro ao atualizar pedido.',
      );
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        subtitle="Pedidos pagos aguardando retirada ou entrega."
      />

      {erro && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {erro}{' '}
          {!tenantCtx && (
            <Link href="/entrar" className="font-medium underline">
              Entrar
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-medium transition ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-2 lg:hidden">
            {orders.length === 0 ? (
              <li className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
                Nenhum pedido pago ainda.
              </li>
            ) : (
              orders.map((order) => (
                <PedidoCard
                  key={order.id}
                  order={order}
                  actionBusy={actionBusy}
                  onAction={handleAction}
                />
              ))
            )}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] lg:block">
            <div className="overflow-x-auto scroll-touch">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-border bg-muted/60">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Cupom</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Itens</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Modalidade</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        Nenhum pedido pago ainda.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <PedidoRow
                        key={order.id}
                        order={order}
                        actionBusy={actionBusy}
                        onAction={handleAction}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type PedidoActionsProps = {
  order: MerchantOrder;
  actionBusy: string | null;
  onAction: (orderId: string, status: FulfillmentAction) => void;
};

function PedidoActions({ order, actionBusy, onAction }: PedidoActionsProps) {
  const actions = availableActions(order);
  if (actions.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const busy = actionBusy === `${order.id}:${action}`;
        const primary = action !== 'done' || actions.length === 1;
        return (
          <button
            key={action}
            type="button"
            disabled={Boolean(actionBusy)}
            onClick={() => onAction(order.id, action)}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition disabled:opacity-60 ${
              primary
                ? 'bg-primary text-primary-foreground hover:opacity-95'
                : 'border border-border text-foreground hover:bg-muted'
            }`}
          >
            {busy ? '…' : ACTION_LABEL[action]}
          </button>
        );
      })}
    </div>
  );
}

function PedidoCard({ order, actionBusy, onAction }: PedidoActionsProps) {
  const status = order.fulfillmentStatus ?? 'awaiting';
  const address = order.fulfillmentMethod === 'delivery' ? formatAddress(order) : null;

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {order.customerName || 'Cliente'}
          </p>
          <p className="text-xs text-muted-foreground">
            Cupom {order.couponCode ?? '—'} · {formatPaidAt(order.paidAt)}
          </p>
        </div>
        <StatusBadge
          label={STATUS_LABEL[status] ?? status}
          tone={STATUS_TONE[status] ?? 'muted'}
        />
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="text-foreground/70">Itens · </span>
          {itemsLabel(order)}
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span>Total {formatCurrency(order.amountCents)}</span>
          {order.shippingCents > 0 && (
            <span>Frete {formatCurrency(order.shippingCents)}</span>
          )}
          <span>{methodLabel(order.fulfillmentMethod)}</span>
        </p>
        {address && (
          <p className="text-xs">
            <span className="text-foreground/70">Endereço · </span>
            {address}
            {order.shippingAddress?.recipientName
              ? ` · ${order.shippingAddress.recipientName}`
              : ''}
          </p>
        )}
      </div>
      <div className="mt-3">
        <PedidoActions order={order} actionBusy={actionBusy} onAction={onAction} />
      </div>
    </li>
  );
}

function PedidoRow({ order, actionBusy, onAction }: PedidoActionsProps) {
  const status = order.fulfillmentStatus ?? 'awaiting';
  const address = order.fulfillmentMethod === 'delivery' ? formatAddress(order) : null;

  return (
    <tr className="transition hover:bg-muted/40">
      <td className="px-5 py-3.5">
        <p className="font-medium text-foreground">{order.couponCode ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{formatPaidAt(order.paidAt)}</p>
      </td>
      <td className="px-5 py-3.5">
        <p className="font-medium text-foreground">{order.customerName || '—'}</p>
      </td>
      <td className="px-5 py-3.5 text-muted-foreground">
        <p>{itemsLabel(order)}</p>
        {address && (
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{address}</p>
        )}
      </td>
      <td className="px-5 py-3.5">
        <p className="font-medium text-foreground">
          {formatCurrency(order.amountCents)}
        </p>
        {order.shippingCents > 0 && (
          <p className="text-xs text-muted-foreground">
            Frete {formatCurrency(order.shippingCents)}
          </p>
        )}
      </td>
      <td className="px-5 py-3.5 text-muted-foreground">
        {methodLabel(order.fulfillmentMethod)}
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge
          label={STATUS_LABEL[status] ?? status}
          tone={STATUS_TONE[status] ?? 'muted'}
        />
      </td>
      <td className="px-5 py-3.5">
        <PedidoActions order={order} actionBusy={actionBusy} onAction={onAction} />
      </td>
    </tr>
  );
}
