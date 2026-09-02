'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/painel/page-header';
import { StaffForbidden } from '@/components/equipe/staff-forbidden';
import {
  ApiHttpError,
  fetchAuthMe,
  getStoredAccessToken,
  isStaffForbiddenError,
  listStaffStores,
  type StaffStore,
} from '@/lib/api';
import {
  STAFF_LOGIN_PATH,
  filterStaffStores,
  isStaffRole,
  storeDisplayName,
} from '@/lib/staff-crm';

export default function EquipeStoresPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stores, setStores] = useState<StaffStore[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = getStoredAccessToken();
      if (!token) {
        window.location.href = STAFF_LOGIN_PATH;
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
        const rows = await listStaffStores();
        if (cancelled) return;
        setStores(rows);
      } catch (err) {
        if (cancelled) return;
        if (isStaffForbiddenError(err)) {
          setForbidden(true);
        } else if (err instanceof ApiHttpError && err.status === 401) {
          window.location.href = STAFF_LOGIN_PATH;
        } else {
          setLoadError('Não foi possível carregar as lojas. Tente de novo.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterStaffStores(stores, search),
    [stores, search],
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando lojas…</p>;
  }

  if (forbidden) {
    return <StaffForbidden />;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lojas"
        subtitle="Escolha a loja para ver os clientes, registrar o contato e emitir o link de pagamento."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Buscar loja</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome da loja"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {stores.length} {stores.length === 1 ? 'loja' : 'lojas'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          {stores.length === 0
            ? 'Nenhuma loja ainda.'
            : 'Nenhuma loja encontrada.'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <li key={store.id}>
              <Link
                href={`/equipe/lojas/${encodeURIComponent(store.id)}`}
                className="block rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
              >
                <p className="font-semibold text-foreground">
                  {storeDisplayName(store)}
                </p>
                {store.slug ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {store.slug}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
