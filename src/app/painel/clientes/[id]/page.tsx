'use client';

import Link from 'next/link';
import { FormEvent, Suspense, use, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Modal } from '@/components/painel/modal';
import { StatusBadge } from '@/components/painel/status-badge';
import {
  MOCK_PRODUCTS,
  addInterest,
  addSale,
  formatCurrency,
  formatDate,
  formatDateTime,
  getCustomer,
  interestSourceLabel,
  markCheckoutPaid,
  saleSourceLabel,
  subscribeCustomers,
  type ClienteStatus,
  type CustomerEvent,
  type EventType,
} from '@/lib/mock-customers';
import {
  addApiInterest,
  createApiSale,
  getApiCustomer,
  listApiProducts,
  markApiCheckoutPaid,
  resolveTenantContext,
  setApiCustomerOptOut,
  type ApiProduct,
} from '@/lib/api';
import {
  mapApiCustomerDetail,
  type CustomerDetailView,
} from '@/lib/customers-api-adapter';

const STATUS_TONE: Record<ClienteStatus, 'success' | 'warning' | 'muted' | 'danger'> = {
  Retornou: 'success',
  Contatado: 'warning',
  Aguardando: 'muted',
  Inativo: 'danger',
};

const CHECKOUT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

const CHECKOUT_STATUS_TONE: Record<string, 'success' | 'warning' | 'muted' | 'danger'> = {
  pending: 'warning',
  paid: 'success',
  expired: 'muted',
  cancelled: 'danger',
};

const EVENT_ICON: Record<EventType, string> = {
  interest: '💡',
  sale: '🛍️',
  checkout_sent: '🔗',
  checkout_paid: '✅',
  outreach: '💬',
  reply: '↩️',
  note: '📝',
};

type Acao = 'interesse' | 'compra' | 'historico';

function ClienteDetailInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  const [modalInteresse, setModalInteresse] = useState(false);
  const [modalCompra, setModalCompra] = useState(false);

  const [produtoInteresse, setProdutoInteresse] = useState(MOCK_PRODUCTS[0].nome);
  const [notasInteresse, setNotasInteresse] = useState('');
  const [produtoCompra, setProdutoCompra] = useState(MOCK_PRODUCTS[0].nome);
  const [valorCompra, setValorCompra] = useState('');

  const [tenantCtx, setTenantCtx] = useState<{
    tenantId: string;
    storeId: string;
  } | null>(null);
  const [apiCustomer, setApiCustomer] = useState<CustomerDetailView | null>(null);
  const [apiProducts, setApiProducts] = useState<ApiProduct[] | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [optOutBusy, setOptOutBusy] = useState(false);

  useEffect(() => subscribeCustomers(() => refresh()), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ctx = await resolveTenantContext();
      if (cancelled) return;
      if (!ctx.tenantId || !ctx.storeId) {
        setApiLoading(false);
        return;
      }
      setTenantCtx({ tenantId: ctx.tenantId, storeId: ctx.storeId });
      try {
        const [detail, products] = await Promise.all([
          getApiCustomer(ctx.tenantId, id),
          listApiProducts(ctx.tenantId, ctx.storeId),
        ]);
        if (cancelled) return;
        setApiCustomer(mapApiCustomerDetail(detail));
        setApiProducts(products.filter((p) => p.active));
      } catch {
        // cliente não é da API (ex.: mock) — segue com fallback local
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function reloadApiCustomer() {
    if (!tenantCtx) return;
    try {
      const detail = await getApiCustomer(tenantCtx.tenantId, id);
      setApiCustomer(mapApiCustomerDetail(detail));
    } catch {
      // mantém estado atual
    }
  }

  const usingApi = apiCustomer !== null;

  const productOptions = useMemo(
    () =>
      apiProducts?.map((p) => ({
        id: p.id,
        nome: p.name,
        precoCents: p.priceCents,
      })) ??
      MOCK_PRODUCTS.map((p) => ({
        id: p.id,
        nome: p.nome,
        precoCents: p.precoCents,
      })),
    [apiProducts],
  );

  useEffect(() => {
    if (productOptions.length > 0) {
      setProdutoInteresse((prev) =>
        productOptions.some((p) => p.nome === prev) ? prev : productOptions[0].nome,
      );
      setProdutoCompra((prev) =>
        productOptions.some((p) => p.nome === prev) ? prev : productOptions[0].nome,
      );
    }
  }, [productOptions]);

  useEffect(() => {
    const acao = searchParams.get('acao') as Acao | null;
    if (acao === 'interesse') setModalInteresse(true);
    if (acao === 'compra') setModalCompra(true);
  }, [searchParams]);

  const customer = apiCustomer ?? getCustomer(id);

  const openInterests = useMemo(
    () => customer?.interests.filter((i) => i.status === 'open') ?? [],
    [customer],
  );

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  async function handleInteresse(e: FormEvent) {
    e.preventDefault();
    if (usingApi && tenantCtx) {
      try {
        const apiProduct = apiProducts?.find((p) => p.name === produtoInteresse);
        await addApiInterest({
          tenantId: tenantCtx.tenantId,
          storeId: tenantCtx.storeId,
          customerId: id,
          ...(apiProduct
            ? { productId: apiProduct.id }
            : { productName: produtoInteresse }),
          notes: notasInteresse || undefined,
        });
        await reloadApiCustomer();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Erro ao registrar interesse.',
        );
        return;
      }
    } else {
      addInterest(id, {
        productName: produtoInteresse,
        notes: notasInteresse || undefined,
      });
    }
    setNotasInteresse('');
    setModalInteresse(false);
  }

  async function handleCompra(e: FormEvent) {
    e.preventDefault();
    const cents = valorCompra
      ? Math.round(parseFloat(valorCompra.replace(',', '.')) * 100)
      : undefined;

    if (usingApi && tenantCtx) {
      const apiProduct = apiProducts?.find((p) => p.name === produtoCompra);
      if (!apiProduct) {
        window.alert('Escolha um produto do catálogo para registrar a compra.');
        return;
      }
      try {
        await createApiSale({
          tenantId: tenantCtx.tenantId,
          storeId: tenantCtx.storeId,
          customerId: id,
          productId: apiProduct.id,
          amountCents: cents ?? apiProduct.priceCents,
        });
        await reloadApiCustomer();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Erro ao registrar compra.',
        );
        return;
      }
    } else {
      addSale(id, { productName: produtoCompra, amountCents: cents });
    }
    setValorCompra('');
    setModalCompra(false);
  }

  async function handleMarkPaid(checkoutId: string) {
    if (usingApi && tenantCtx) {
      try {
        await markApiCheckoutPaid(tenantCtx.tenantId, checkoutId);
        await reloadApiCustomer();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Erro ao marcar como pago.',
        );
      }
      return;
    }
    markCheckoutPaid(checkoutId);
  }

  async function handleToggleOptOut() {
    if (!usingApi || !tenantCtx || !apiCustomer) return;
    setOptOutBusy(true);
    try {
      await setApiCustomerOptOut(tenantCtx.tenantId, id, !apiCustomer.optedOut);
      await reloadApiCustomer();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Erro ao alterar opt-out.',
      );
    } finally {
      setOptOutBusy(false);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      window.alert('Link copiado para a área de transferência.');
    });
  }

  if (apiLoading && !customer) {
    return <p className="text-sm text-muted-foreground">Carregando ficha…</p>;
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Link
          href="/painel/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Voltar para clientes
        </Link>
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
        </div>
      </div>
    );
  }

  const optedOut = usingApi ? Boolean(apiCustomer?.optedOut) : false;

  return (
    <div className="space-y-6">
      <Link
        href="/painel/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Voltar para clientes
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {customer.displayName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{customer.phoneMasked}</p>
          {optedOut && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Opt-out ativo — não receberá mensagens automáticas da Voltou.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={customer.status} tone={STATUS_TONE[customer.status]} />
          {usingApi && (
            <button
              type="button"
              disabled={optOutBusy}
              onClick={() => void handleToggleOptOut()}
              className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
            >
              {optOutBusy
                ? 'Salvando…'
                : optedOut
                  ? 'Reativar contato'
                  : 'Opt-out (LGPD)'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <ActionButton
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12v2h8v-2a7 7 0 0 0-4-12Z" />
            </svg>
          }
          label="Registrar interesse"
          onClick={() => setModalInteresse(true)}
        />
        <ActionButton
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          }
          label="Registrar compra (loja física)"
          onClick={() => setModalCompra(true)}
          variant="outline"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" id="historico">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-semibold text-foreground">Histórico unificado</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Interesses, compras, checkouts e respostas do WhatsApp
            </p>
            <div className="mt-5 space-y-0">
              {customer.events.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento registrado.</p>
              )}
              {customer.events.map((event, idx) => (
                <TimelineItem key={event.id} event={event} isLast={idx === customer.events.length - 1} />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <SideCard title="Interesses abertos" count={openInterests.length}>
            {openInterests.length === 0 ? (
              <EmptyState text="Nenhum interesse em aberto." />
            ) : (
              openInterests.map((interest) => (
                <div key={interest.id} className="border-b border-border py-3 last:border-0 last:pb-0 first:pt-0">
                  <p className="text-sm font-medium text-foreground">{interest.productNameSnapshot}</p>
                  <p className="mt-0.5 text-sm text-primary">
                    {interest.productPriceCents
                      ? formatCurrency(interest.productPriceCents)
                      : '—'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {interestSourceLabel(interest.source)} · {formatDate(interest.interestedAt)}
                  </p>
                  {interest.notes && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{interest.notes}</p>
                  )}
                </div>
              ))
            )}
          </SideCard>

          <SideCard title="Compras" count={customer.sales.length}>
            {customer.sales.length === 0 ? (
              <EmptyState text="Nenhuma compra registrada." />
            ) : (
              customer.sales.map((sale) => (
                <div key={sale.id} className="border-b border-border py-3 last:border-0 last:pb-0 first:pt-0">
                  <p className="text-sm font-medium text-foreground">{sale.productName}</p>
                  <p className="mt-0.5 text-sm text-primary">{formatCurrency(sale.amountCents)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {saleSourceLabel(sale.source)} · {formatDate(sale.soldAt)}
                  </p>
                </div>
              ))
            )}
          </SideCard>

          <SideCard title="Checkouts" count={customer.checkouts.length}>
            {customer.checkouts.length === 0 ? (
              <EmptyState text="Nenhum link de pagamento gerado." />
            ) : (
              customer.checkouts.map((checkout) => (
                <div key={checkout.id} className="border-b border-border py-3 last:border-0 last:pb-0 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{checkout.productNameSnapshot}</p>
                    <StatusBadge
                      label={CHECKOUT_STATUS_LABEL[checkout.status]}
                      tone={CHECKOUT_STATUS_TONE[checkout.status]}
                    />
                  </div>
                  <p className="mt-0.5 text-sm text-primary">{formatCurrency(checkout.amountCents)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyUrl(checkout.paymentUrl)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium text-foreground transition hover:bg-muted"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      Copiar link
                    </button>
                    {checkout.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleMarkPaid(checkout.id)}
                          className="inline-flex h-7 items-center rounded-lg bg-primary/10 px-2 text-xs font-medium text-primary transition hover:bg-primary/20"
                        >
                          Marcar pago
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </SideCard>
        </aside>
      </div>

      <Modal
        open={modalInteresse}
        onClose={() => setModalInteresse(false)}
        title="Registrar interesse"
        description="Registre o que o cliente demonstrou interesse em comprar."
      >
        <form onSubmit={(e) => void handleInteresse(e)} className="space-y-4">
          <div>
            <label htmlFor="produtoInteresse" className="text-sm font-medium text-foreground">
              Produto
            </label>
            <select
              id="produtoInteresse"
              value={produtoInteresse}
              onChange={(e) => setProdutoInteresse(e.target.value)}
              className={fieldClass}
            >
              {productOptions.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome} — {formatCurrency(p.precoCents)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notasInteresse" className="text-sm font-medium text-foreground">
              Observações
            </label>
            <textarea
              id="notasInteresse"
              value={notasInteresse}
              onChange={(e) => setNotasInteresse(e.target.value)}
              rows={3}
              placeholder="Ex.: perguntou sobre tamanho, cor preferida..."
              className={fieldClass}
            />
          </div>
          <ModalActions onCancel={() => setModalInteresse(false)} submitLabel="Salvar interesse" />
        </form>
      </Modal>

      <Modal
        open={modalCompra}
        onClose={() => setModalCompra(false)}
        title="Registrar compra (loja física)"
        description="Compra feita presencialmente, sem link de pagamento."
      >
        <form onSubmit={(e) => void handleCompra(e)} className="space-y-4">
          <div>
            <label htmlFor="produtoCompra" className="text-sm font-medium text-foreground">
              Produto
            </label>
            <select
              id="produtoCompra"
              value={produtoCompra}
              onChange={(e) => {
                setProdutoCompra(e.target.value);
                const p = productOptions.find((x) => x.nome === e.target.value);
                if (p) setValorCompra((p.precoCents / 100).toFixed(2).replace('.', ','));
              }}
              className={fieldClass}
            >
              {productOptions.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="valorCompra" className="text-sm font-medium text-foreground">
              Valor (R$)
            </label>
            <input
              id="valorCompra"
              value={valorCompra}
              onChange={(e) => setValorCompra(e.target.value)}
              placeholder="349,90"
              className={fieldClass}
            />
          </div>
          <ModalActions onCancel={() => setModalCompra(false)} submitLabel="Registrar compra" />
        </form>
      </Modal>
    </div>
  );
}

export default function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Carregando ficha…</p>
      }
    >
      <ClienteDetailInner id={id} />
    </Suspense>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'outline';
}) {
  const base =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:opacity-95'
      : 'border border-border bg-card text-foreground hover:bg-muted';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition sm:w-auto ${base}`}
    >
      {icon}
      {label}
    </button>
  );
}

function SideCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}

function TimelineItem({ event, isLast }: { event: CustomerEvent; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm">
          {EVENT_ICON[event.type]}
        </span>
        {!isLast && <div className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        {event.detail && (
          <p className="mt-0.5 text-sm text-muted-foreground">{event.detail}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  submitLabel,
  disabled = false,
}: {
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </div>
  );
}
