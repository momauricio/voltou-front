'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/painel/modal';
import { PageHeader } from '@/components/painel/page-header';
import {
  createStaffCheckout,
  ApiHttpError,
  fetchAuthMe,
  getStoredAccessToken,
  isStaffForbiddenError,
  listApiProducts,
  listStaffCustomers,
  listStaffStores,
  registerStaffContact,
  type ApiProduct,
  type StaffContactChannel,
  type StaffCustomer,
  type StaffStore,
} from '@/lib/api';
import {
  LOJISTA_SESSION_MESSAGE,
  formatStaffLastContacted,
  isStaffRole,
  parseReaisToCents,
  resolveStaffStoreSlug,
  staffCheckoutPublicUrl,
  staffCustomerPhone,
  storeDisplayName,
} from '@/lib/staff-crm';

const CHANNELS: { id: StaffContactChannel; label: string }[] = [
  { id: 'call', label: 'Ligação' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'other', label: 'Outro' },
];

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20';

function formatBrlCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function EquipePage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<StaffCustomer[]>([]);
  const [stores, setStores] = useState<StaffStore[]>([]);
  const [search, setSearch] = useState('');
  const [issuedUrls, setIssuedUrls] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [contactTarget, setContactTarget] = useState<StaffCustomer | null>(null);
  const [channel, setChannel] = useState<StaffContactChannel>('call');
  const [note, setNote] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const [linkTarget, setLinkTarget] = useState<StaffCustomer | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [amountReais, setAmountReais] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = getStoredAccessToken();
      if (!token) {
        window.location.href = '/entrar';
        return;
      }
      try {
        const { user } = await fetchAuthMe(token);
        if (!isStaffRole(user.role)) {
          if (!cancelled) {
            setForbidden(true);
            setLoading(false);
          }
          return;
        }
        const [rows, storeRows] = await Promise.all([
          listStaffCustomers(),
          listStaffStores().catch(() => [] as StaffStore[]),
        ]);
        if (cancelled) return;
        setCustomers(rows);
        setStores(storeRows);
      } catch (err) {
        if (cancelled) return;
        if (isStaffForbiddenError(err)) {
          setForbidden(true);
        } else if (err instanceof ApiHttpError && err.status === 401) {
          window.location.href = '/entrar';
        } else {
          setLoadError(
            'Não foi possível carregar os clientes. Tente de novo.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = [
        c.displayName,
        staffCustomerPhone(c),
        c.phoneE164,
        c.phoneMasked,
        storeDisplayName(c),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [customers, search]);

  function slugFor(customer: StaffCustomer) {
    return resolveStaffStoreSlug(customer, stores);
  }

  async function copyUrl(customerId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(customerId);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt('Copie o link:', url);
    }
  }

  async function handleRegisterContact(e: FormEvent) {
    e.preventDefault();
    if (!contactTarget) return;
    setContactBusy(true);
    setContactError(null);
    try {
      const event = await registerStaffContact(contactTarget.id, {
        channel,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      const occurredAt = event.occurredAt;
      setCustomers((rows) =>
        rows.map((row) =>
          row.id === contactTarget.id
            ? { ...row, lastContactedAt: occurredAt }
            : row,
        ),
      );
      setContactTarget(null);
      setNote('');
      setChannel('call');
    } catch {
      setContactError('Não foi possível registrar o contato. Tente de novo.');
    } finally {
      setContactBusy(false);
    }
  }

  useEffect(() => {
    if (!linkTarget) {
      setProducts([]);
      setProductId('');
      setAmountReais('');
      setLinkError(null);
      return;
    }
    let cancelled = false;
    setProductsLoading(true);
    setLinkError(null);
    void listApiProducts(linkTarget.tenantId, linkTarget.storeId)
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((p) => p.active);
        setProducts(active);
        const first = active[0];
        if (first) {
          setProductId(first.id);
          setAmountReais((first.priceCents / 100).toFixed(2).replace('.', ','));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLinkError('Não foi possível carregar os produtos desta loja.');
        }
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkTarget]);

  async function handleEmitLink(e: FormEvent) {
    e.preventDefault();
    if (!linkTarget || !productId) return;
    const amountCents = parseReaisToCents(amountReais);
    if (amountCents == null) {
      setLinkError('Informe um valor válido.');
      return;
    }
    setLinkBusy(true);
    setLinkError(null);
    try {
      const checkout = await createStaffCheckout({
        tenantId: linkTarget.tenantId,
        storeId: linkTarget.storeId,
        customerId: linkTarget.id,
        productId,
        amountCents,
      });
      const url = staffCheckoutPublicUrl({
        storeSlug: slugFor(linkTarget),
        couponCode: checkout.couponCode,
        paymentUrl: checkout.paymentUrl,
      });
      if (!url) {
        setLinkError('O link foi criado, mas a URL pública não veio na resposta.');
        return;
      }
      setIssuedUrls((prev) => ({ ...prev, [linkTarget.id]: url }));
      setLinkTarget(null);
      await copyUrl(linkTarget.id, url);
    } catch {
      setLinkError('Não foi possível emitir o link. Tente de novo.');
    } finally {
      setLinkBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando clientes…</p>;
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Sessão de lojista
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {LOJISTA_SESSION_MESSAGE}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/painel"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Ir ao painel da loja
          </Link>
          <Link
            href="/entrar"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Entrar com conta da equipe
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        subtitle="A equipe Voltou registra o contato e envia o link para a segunda venda."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Buscar cliente</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou loja"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {customers.length} {customers.length === 1 ? 'cliente' : 'clientes'}
        </p>
      </div>

      <ul className="space-y-2 lg:hidden">
        {filtered.length === 0 ? (
          <li className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
            {customers.length === 0
              ? 'Nenhum cliente ainda.'
              : 'Nenhum cliente encontrado.'}
          </li>
        ) : (
          filtered.map((customer) => (
            <StaffCustomerCard
              key={customer.id}
              customer={customer}
              issuedUrl={issuedUrls[customer.id]}
              copied={copiedId === customer.id}
              onContact={() => {
                setContactError(null);
                setChannel('call');
                setNote('');
                setContactTarget(customer);
              }}
              onEmit={() => setLinkTarget(customer)}
              onCopy={
                issuedUrls[customer.id]
                  ? () => void copyUrl(customer.id, issuedUrls[customer.id]!)
                  : undefined
              }
            />
          ))
        )}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border bg-muted/60">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Loja</th>
                <th className="px-5 py-3 font-medium">Telefone</th>
                <th className="px-5 py-3 font-medium">Contato</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((customer) => (
                <tr key={customer.id} className="align-top">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">
                      {customer.displayName}
                    </p>
                    {issuedUrls[customer.id] ? (
                      <IssuedLink
                        url={issuedUrls[customer.id]!}
                        copied={copiedId === customer.id}
                        onCopy={() =>
                          void copyUrl(customer.id, issuedUrls[customer.id]!)
                        }
                      />
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {storeDisplayName(customer)}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-foreground">
                    {staffCustomerPhone(customer)}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {formatStaffLastContacted(customer.lastContactedAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <RowActions
                      onContact={() => {
                        setContactError(null);
                        setChannel('call');
                        setNote('');
                        setContactTarget(customer);
                      }}
                      onEmit={() => setLinkTarget(customer)}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    {customers.length === 0
                      ? 'Nenhum cliente ainda.'
                      : 'Nenhum cliente encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={contactTarget != null}
        onClose={() => !contactBusy && setContactTarget(null)}
        title="Registrar contato"
        description={
          contactTarget
            ? `Marque que a equipe falou com ${contactTarget.displayName}.`
            : undefined
        }
      >
        <form onSubmit={(e) => void handleRegisterContact(e)} className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Canal</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CHANNELS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-sm font-medium transition ${
                    channel === opt.id
                      ? 'border-primary bg-accent text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value={opt.id}
                    checked={channel === opt.id}
                    onChange={() => setChannel(opt.id)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="contact-note" className="text-sm font-medium text-foreground">
              Nota (opcional)
            </label>
            <textarea
              id="contact-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ex.: atendeu, pediu para mandar o link"
              className={fieldClass}
            />
          </div>
          {contactError ? (
            <p role="alert" className="text-sm text-red-700">
              {contactError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setContactTarget(null)}
              disabled={contactBusy}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={contactBusy}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {contactBusy ? 'Salvando…' : 'Salvar contato'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={linkTarget != null}
        onClose={() => !linkBusy && setLinkTarget(null)}
        title="Emitir link"
        description={
          linkTarget
            ? `Link de pagamento para ${linkTarget.displayName} · ${storeDisplayName(linkTarget)}`
            : undefined
        }
      >
        <form onSubmit={(e) => void handleEmitLink(e)} className="space-y-4">
          {productsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando produtos…</p>
          ) : products.length === 0 && !linkError ? (
            <p className="text-sm text-muted-foreground">
              Esta loja ainda não tem produto cadastrado.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="link-product" className="text-sm font-medium text-foreground">
                  Produto
                </label>
                <select
                  id="link-product"
                  value={productId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setProductId(id);
                    const product = products.find((p) => p.id === id);
                    if (product) {
                      setAmountReais(
                        (product.priceCents / 100).toFixed(2).replace('.', ','),
                      );
                    }
                  }}
                  className={fieldClass}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatBrlCents(p.priceCents)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="link-amount" className="text-sm font-medium text-foreground">
                  Valor (R$)
                </label>
                <input
                  id="link-amount"
                  inputMode="decimal"
                  value={amountReais}
                  onChange={(e) => setAmountReais(e.target.value)}
                  className={fieldClass}
                  required
                />
                {selectedProduct ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Preço da loja: {formatBrlCents(selectedProduct.priceCents)}
                  </p>
                ) : null}
              </div>
            </>
          )}
          {linkError ? (
            <p role="alert" className="text-sm text-red-700">
              {linkError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setLinkTarget(null)}
              disabled={linkBusy}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={linkBusy || productsLoading || products.length === 0}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {linkBusy ? 'Emitindo…' : 'Emitir link'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RowActions({
  onContact,
  onEmit,
}: {
  onContact: () => void;
  onEmit: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onContact}
        className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
      >
        Registrar contato
      </button>
      <button
        type="button"
        onClick={onEmit}
        className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
      >
        Emitir link
      </button>
    </div>
  );
}

function IssuedLink({
  url,
  copied,
  onCopy,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="max-w-[22rem] truncate text-xs text-primary hover:underline"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-7 items-center rounded-md border border-border px-2 text-[11px] font-medium text-foreground hover:bg-muted"
      >
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function StaffCustomerCard({
  customer,
  issuedUrl,
  copied,
  onContact,
  onEmit,
  onCopy,
}: {
  customer: StaffCustomer;
  issuedUrl?: string;
  copied: boolean;
  onContact: () => void;
  onEmit: () => void;
  onCopy?: () => void;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <p className="font-semibold text-foreground">{customer.displayName}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {storeDisplayName(customer)}
      </p>
      <p className="mt-2 text-sm tabular-nums text-foreground">
        {staffCustomerPhone(customer)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatStaffLastContacted(customer.lastContactedAt)}
      </p>
      {issuedUrl && onCopy ? (
        <IssuedLink url={issuedUrl} copied={copied} onCopy={onCopy} />
      ) : null}
      <div className="mt-3">
        <RowActions onContact={onContact} onEmit={onEmit} />
      </div>
    </li>
  );
}
