'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/painel/page-header';
import { PickupAddressNudge } from '@/components/painel/pickup-address-nudge';
import { StatusBadge } from '@/components/painel/status-badge';
import {
  cancelMerchantOrder,
  getFulfillmentSettings,
  listMerchantOrders,
  resolveTenantContext,
  updateOrderFulfillment,
  type MerchantOrder,
} from '@/lib/api';
import {
  formatDateTimePtBr,
  merchantOrderRefs,
  PICKUP_ADDRESS_CHANGED_EVENT,
  PICKUP_ADDRESS_NUDGE_MESSAGE,
  shouldBlockPickupCompletion,
} from '@/lib/lojista-panel-ux';

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
  return formatDateTimePtBr(iso);
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
  if (order.status === 'cancelled') return [];
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
  const [storePickupAddress, setStorePickupAddress] = useState<
    string | undefined
  >(undefined);

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
    const loadPickupAddress = async () => {
      try {
        const settings = await getFulfillmentSettings(
          tenantCtx.tenantId,
          tenantCtx.storeId,
        );
        if (!cancelled) {
          setStorePickupAddress(settings.pickupAddressText ?? '');
        }
      } catch {
        if (!cancelled) setStorePickupAddress(undefined);
      }
    };
    void loadPickupAddress();
    const onChanged = () => {
      void loadPickupAddress();
    };
    window.addEventListener(PICKUP_ADDRESS_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(PICKUP_ADDRESS_CHANGED_EVENT, onChanged);
    };
  }, [tenantCtx]);

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
    const order = orders.find((o) => o.id === orderId);
    if (
      order &&
      shouldBlockPickupCompletion({
        pickupAddressText: storePickupAddress,
        fulfillmentMethod: order.fulfillmentMethod,
      }) &&
      (status === 'ready' || status === 'done')
    ) {
      window.alert(PICKUP_ADDRESS_NUDGE_MESSAGE);
      return;
    }
    setActionBusy(`${orderId}:${status}`);
    try {
      let trackingCode: string | undefined;
      if (status === 'shipped') {
        const current = order?.trackingCode?.trim() ?? '';
        const entered = window.prompt(
          'Código de rastreio (opcional):',
          current,
        );
        if (entered === null) {
          setActionBusy(null);
          return;
        }
        trackingCode = entered.trim() || undefined;
      }
      await updateOrderFulfillment({
        checkoutId: orderId,
        tenantId: tenantCtx.tenantId,
        storeId: tenantCtx.storeId,
        status,
        ...(trackingCode ? { trackingCode } : {}),
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

  async function handleCancel(orderId: string) {
    if (!tenantCtx) return;
    const ok = window.confirm(
      'Cancelar este pedido e reembolsar o pagamento no Mercado Pago?',
    );
    if (!ok) return;
    setActionBusy(`${orderId}:cancel`);
    try {
      await cancelMerchantOrder({
        checkoutId: orderId,
        tenantId: tenantCtx.tenantId,
        storeId: tenantCtx.storeId,
      });
      await reload(tenantCtx.tenantId, tenantCtx.storeId, filter);
      setErro(null);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Erro ao cancelar pedido.',
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

      <PickupAddressNudge />

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
                  onCancel={handleCancel}
                  storePickupAddress={storePickupAddress}
                />
              ))
            )}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] lg:block">
            <div className="overflow-x-auto scroll-touch">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-border bg-muted/60">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Pedido</th>
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
                        onCancel={handleCancel}
                        storePickupAddress={storePickupAddress}
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
  onCancel: (orderId: string) => void;
  storePickupAddress?: string;
};

function PedidoActions({
  order,
  actionBusy,
  onAction,
  onCancel,
  storePickupAddress,
}: PedidoActionsProps) {
  const cancelled = order.status === 'cancelled';
  const actions = availableActions(order);
  const blockPickupComplete = shouldBlockPickupCompletion({
    pickupAddressText: storePickupAddress,
    fulfillmentMethod: order.fulfillmentMethod,
  });
  if (cancelled) {
    return (
      <span className="text-xs font-medium text-red-700">Cancelado</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const busy = actionBusy === `${order.id}:${action}`;
        const primary = action !== 'done' || actions.length === 1;
        const blocked = blockPickupComplete && (action === 'ready' || action === 'done');
        return (
          <button
            key={action}
            type="button"
            disabled={Boolean(actionBusy) || blocked}
            title={blocked ? PICKUP_ADDRESS_NUDGE_MESSAGE : undefined}
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
      {order.fulfillmentStatus !== 'done' && (
        <button
          type="button"
          disabled={Boolean(actionBusy)}
          onClick={() => onCancel(order.id)}
          className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {actionBusy === `${order.id}:cancel` ? '…' : 'Cancelar'}
        </button>
      )}
      {actions.length === 0 && order.fulfillmentStatus === 'done' && (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

function PedidoRefs({ order }: { order: MerchantOrder }) {
  const refs = merchantOrderRefs(order);
  return (
    <div>
      <p className="font-medium text-foreground">
        {refs.voltou.label} {refs.voltou.value}
      </p>
      {(refs.coupon || refs.mercadoPago) && (
        <p className="text-xs text-muted-foreground">
          {refs.coupon ? `${refs.coupon.label} ${refs.coupon.value}` : null}
          {refs.coupon && refs.mercadoPago ? ' · ' : null}
          {refs.mercadoPago
            ? `${refs.mercadoPago.label} ${refs.mercadoPago.value}`
            : null}
        </p>
      )}
    </div>
  );
}

function PedidoCard({
  order,
  actionBusy,
  onAction,
  onCancel,
  storePickupAddress,
}: PedidoActionsProps) {
  const status = order.fulfillmentStatus ?? 'awaiting';
  const address = order.fulfillmentMethod === 'delivery' ? formatAddress(order) : null;
  const cancelled = order.status === 'cancelled';

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {order.customerName || 'Cliente'}
          </p>
          <PedidoRefs order={order} />
          <p className="text-xs text-muted-foreground">{formatPaidAt(order.paidAt)}</p>
        </div>
        <StatusBadge
          label={
            cancelled ? 'Cancelado' : (STATUS_LABEL[status] ?? status)
          }
          tone={cancelled ? 'danger' : (STATUS_TONE[status] ?? 'muted')}
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
        {order.trackingCode && (
          <p className="text-xs">
            <span className="text-foreground/70">Rastreio · </span>
            {order.trackingCode}
          </p>
        )}
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
        <PedidoActions
          order={order}
          actionBusy={actionBusy}
          onAction={onAction}
          onCancel={onCancel}
          storePickupAddress={storePickupAddress}
        />
      </div>
    </li>
  );
}

function PedidoRow({
  order,
  actionBusy,
  onAction,
  onCancel,
  storePickupAddress,
}: PedidoActionsProps) {
  const status = order.fulfillmentStatus ?? 'awaiting';
  const address = order.fulfillmentMethod === 'delivery' ? formatAddress(order) : null;
  const cancelled = order.status === 'cancelled';

  return (
    <tr className="transition hover:bg-muted/40">
      <td className="px-5 py-3.5">
        <PedidoRefs order={order} />
        <p className="text-xs text-muted-foreground">{formatPaidAt(order.paidAt)}</p>
      </td>
      <td className="px-5 py-3.5">
        <p className="font-medium text-foreground">{order.customerName || '—'}</p>
      </td>
      <td className="px-5 py-3.5 text-muted-foreground">
        <p>{itemsLabel(order)}</p>
        {order.trackingCode && (
          <p className="mt-1 text-xs">Rastreio {order.trackingCode}</p>
        )}
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
          label={
            cancelled ? 'Cancelado' : (STATUS_LABEL[status] ?? status)
          }
          tone={cancelled ? 'danger' : (STATUS_TONE[status] ?? 'muted')}
        />
      </td>
      <td className="px-5 py-3.5">
        <PedidoActions
          order={order}
          actionBusy={actionBusy}
          onAction={onAction}
          onCancel={onCancel}
          storePickupAddress={storePickupAddress}
        />
      </td>
    </tr>
  );
}
