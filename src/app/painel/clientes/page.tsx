'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PageHeader } from '@/components/painel/page-header';
import { Modal } from '@/components/painel/modal';
import { StatusBadge } from '@/components/painel/status-badge';
import {
  MOCK_PRODUCTS,
  createCustomer,
  listCustomers,
  removeCustomer,
  subscribeCustomers,
  upsertCustomerFromImport,
  type ClienteStatus,
  type MockCustomer,
} from '@/lib/mock-customers';
import {
  downloadCustomerCsvTemplate,
  parseCustomerCsv,
  type CustomerCsvRow,
} from '@/lib/csv-customers';
import { ImportCenter } from '@/components/painel/import-center';
import {
  createApiCustomer,
  deleteApiCustomer,
  getStoredTenantContext,
  listApiCustomers,
  listApiProducts,
  resolveTenantContext,
  type ApiProduct,
} from '@/lib/api';
import { mapApiCustomerSummary } from '@/lib/customers-api-adapter';

const STATUS_TONE: Record<ClienteStatus, 'success' | 'warning' | 'muted' | 'danger'> = {
  Retornou: 'success',
  Contatado: 'warning',
  Aguardando: 'muted',
  Inativo: 'danger',
};

type MenuAcao = 'ficha' | 'interesse' | 'historico';

export default function ClientesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando…</div>}>
      <ClientesPageInner />
    </Suspense>
  );
}

function ClientesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [search, setSearch] = useState('');
  const [ordem, setOrdem] = useState('recentes');
  const [status, setStatus] = useState('todos');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [novoNome, setNovoNome] = useState('');
  const [novoWhatsapp, setNovoWhatsapp] = useState('');
  const [novoProduto, setNovoProduto] = useState(MOCK_PRODUCTS[0].nome);

  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CustomerCsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  const [tenantCtx, setTenantCtx] = useState<{
    tenantId: string;
    storeId: string;
  } | null>(null);
  const [apiClientes, setApiClientes] = useState<MockCustomer[] | null>(null);
  const [apiProducts, setApiProducts] = useState<ApiProduct[] | null>(null);
  const [apiErro, setApiErro] = useState<string | null>(null);

  useEffect(() => subscribeCustomers(() => refresh()), []);

  useEffect(() => {
    let cancelled = false;
    void resolveTenantContext().then((ctx) => {
      if (cancelled || !ctx.tenantId || !ctx.storeId) return;
      setTenantCtx({ tenantId: ctx.tenantId, storeId: ctx.storeId });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tenantCtx) return;
    let cancelled = false;
    void (async () => {
      try {
        const [customers, products] = await Promise.all([
          listApiCustomers(tenantCtx.tenantId, tenantCtx.storeId),
          listApiProducts(tenantCtx.tenantId, tenantCtx.storeId),
        ]);
        if (cancelled) return;
        setApiClientes(customers.map(mapApiCustomerSummary));
        setApiProducts(products.filter((p) => p.active));
        setApiErro(null);
      } catch (err) {
        if (cancelled) return;
        setApiErro(
          err instanceof Error
            ? `Não foi possível carregar da API (${err.message}) — mostrando dados de demonstração.`
            : 'Não foi possível carregar da API — mostrando dados de demonstração.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantCtx]);

  async function reloadApiCustomers() {
    if (!tenantCtx) return;
    try {
      const customers = await listApiCustomers(tenantCtx.tenantId, tenantCtx.storeId);
      setApiClientes(customers.map(mapApiCustomerSummary));
    } catch {
      // mantém a lista atual
    }
  }

  useEffect(() => {
    if (apiProducts && apiProducts.length > 0) {
      setNovoProduto((prev) =>
        apiProducts.some((p) => p.name === prev) ? prev : apiProducts[0].name,
      );
    }
  }, [apiProducts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const usingApi = apiClientes !== null;
  const clientes = apiClientes ?? listCustomers();

  const produtoOptions = useMemo(
    () =>
      apiProducts?.map((p) => ({ id: p.id, nome: p.name })) ??
      MOCK_PRODUCTS.map((p) => ({ id: p.id, nome: p.nome })),
    [apiProducts],
  );

  const filtrados = useMemo(() => {
    let lista = clientes.filter((c) => {
      const matchSearch =
        search.trim() === '' ||
        c.displayName.toLowerCase().includes(search.trim().toLowerCase()) ||
        c.produto.toLowerCase().includes(search.trim().toLowerCase());
      const matchStatus = status === 'todos' || c.status === status;
      return matchSearch && matchStatus;
    });

    if (ordem === 'nome') {
      lista = [...lista].sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else if (ordem === 'compra') {
      lista = [...lista].sort((a, b) => b.compra.localeCompare(a.compra));
    }

    return lista;
  }, [clientes, search, status, ordem]);

  async function handleNovoCliente(e: FormEvent) {
    e.preventDefault();
    if (!novoNome.trim() || !novoWhatsapp.trim()) return;

    if (tenantCtx && usingApi) {
      try {
        const apiProduct = apiProducts?.find((p) => p.name === novoProduto);
        await createApiCustomer({
          tenantId: tenantCtx.tenantId,
          storeId: tenantCtx.storeId,
          displayName: novoNome.trim(),
          phone: novoWhatsapp.trim(),
          ...(apiProduct
            ? { interestProductId: apiProduct.id }
            : novoProduto
              ? { interestProductName: novoProduto }
              : {}),
        });
        await reloadApiCustomers();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Erro ao criar cliente.',
        );
        return;
      }
    } else {
      createCustomer({
        nome: novoNome.trim(),
        whatsapp: novoWhatsapp.trim(),
        produtoInteresse: novoProduto,
      });
    }

    setNovoNome('');
    setNovoWhatsapp('');
    setNovoProduto(produtoOptions[0]?.nome ?? '');
    setModalOpen(false);
  }

  async function handleRemoveCliente(id: string) {
    if (tenantCtx && usingApi) {
      try {
        await deleteApiCustomer(tenantCtx.tenantId, id);
        await reloadApiCustomers();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Erro ao remover cliente.',
        );
      }
      return;
    }
    removeCustomer(id);
  }

  function openImport() {
    const { tenantId, storeId } = getStoredTenantContext();
    if (tenantId && storeId) {
      setImportCenterOpen(true);
      return;
    }
    // Sem sessão (demo com mocks): usa o importador CSV local
    openCsvModal();
  }

  useEffect(() => {
    if (searchParams.get('import') !== '1') return;
    const { tenantId, storeId } = getStoredTenantContext();
    if (tenantId && storeId) setImportCenterOpen(true);
  }, [searchParams]);

  function openCsvModal() {
    setCsvModalOpen(true);
    setCsvFileName(null);
    setCsvPreview([]);
    setCsvErrors([]);
    setCsvResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleCsvFile(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setCsvErrors(['Envie um arquivo .csv.']);
      setCsvPreview([]);
      setCsvFileName(null);
      return;
    }

    setCsvFileName(file.name);
    setCsvResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseCustomerCsv(text);
      setCsvPreview(parsed.rows);
      setCsvErrors(parsed.errors);
    };
    reader.onerror = () => {
      setCsvErrors(['Não foi possível ler o arquivo.']);
      setCsvPreview([]);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function confirmCsvImport() {
    if (csvPreview.length === 0) return;
    setCsvImporting(true);

    let created = 0;
    let updated = 0;
    for (const row of csvPreview) {
      const result = upsertCustomerFromImport({
        nome: row.nome,
        telefone: row.telefone,
        telefoneDigits: row.telefoneDigits,
        produto: row.produto,
        dataCompra: row.dataCompra,
      });
      if (result.created) created += 1;
      else updated += 1;
    }

    setCsvResult(`${created} cliente(s) novos · ${updated} atualizado(s) pelo telefone.`);
    setCsvImporting(false);
    setCsvPreview([]);
    setCsvFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function navigateAcao(clienteId: string, acao: MenuAcao) {
    setMenuOpenId(null);
    const base = `/painel/clientes/${clienteId}`;
    if (acao === 'ficha' || acao === 'historico') {
      router.push(acao === 'historico' ? `${base}#historico` : base);
    } else {
      router.push(`${base}?acao=${acao}`);
    }
  }

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cadastrados · ${filtrados.length} exibidos`}
        actions={
          <>
            <button
              type="button"
              onClick={openImport}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 21h14" />
              </svg>
              Importar dados
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Novo cliente
            </button>
          </>
        }
      />

      {!usingApi && !tenantCtx && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Você está vendo <span className="font-semibold">dados de demonstração</span>.
          Entre na sua conta para ver seus clientes reais.
        </div>
      )}
      {apiErro && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {apiErro}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-1">
            Buscar
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou produto"
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Ordem
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome A-Z</option>
              <option value="compra">Compra recente</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="todos">Todos</option>
              <option value="Aguardando">Aguardando</option>
              <option value="Contatado">Contatado</option>
              <option value="Retornou">Retornou</option>
              <option value="Inativo">Inativo</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            De
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Até
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 lg:hidden">
        {filtrados.length === 0 ? (
          <li className="rounded-2xl border border-border bg-card px-4 py-10 text-center shadow-[var(--shadow-soft)]">
            <p className="text-sm text-muted-foreground">
              {usingApi && clientes.length === 0
                ? 'Nenhum cliente na loja ainda.'
                : 'Nenhum cliente encontrado com esses filtros.'}
            </p>
            {usingApi && clientes.length === 0 && (
              <Link
                href="/painel/clientes?import=1"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Importar planilha do PDV
              </Link>
            )}
          </li>
        ) : (
          filtrados.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={c}
              menuOpen={menuOpenId === c.id}
              menuRef={menuOpenId === c.id ? menuRef : undefined}
              onToggleMenu={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
              onNavigate={(acao) => navigateAcao(c.id, acao)}
              onRemove={() => void handleRemoveCliente(c.id)}
            />
          ))
        )}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] lg:block">
        <div className="overflow-x-auto scroll-touch">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/60">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">Compra</th>
                <th className="px-5 py-3 font-medium">Disparo</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((c) => (
                <ClienteRow
                  key={c.id}
                  cliente={c}
                  menuOpen={menuOpenId === c.id}
                  menuRef={menuOpenId === c.id ? menuRef : undefined}
                  onToggleMenu={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                  onNavigate={(acao) => navigateAcao(c.id, acao)}
                  onRemove={() => void handleRemoveCliente(c.id)}
                />
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    {usingApi && clientes.length === 0 ? (
                      <span className="inline-flex flex-col items-center gap-3">
                        Nenhum cliente na loja ainda.
                        <Link
                          href="/painel/clientes?import=1"
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                        >
                          Importar planilha do PDV
                        </Link>
                      </span>
                    ) : (
                      'Nenhum cliente encontrado com esses filtros.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 8 5-5 5 5" />
              <path d="M5 21h14" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Importe sua base em segundos</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Jogue qualquer planilha CSV ou Excel — detectamos clientes e produtos automaticamente.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openImport}
          className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Importar dados
        </button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo cliente"
        description="Cadastro manual — o cliente entra na base da loja para a Voltou recuperar a próxima compra."
      >
        <form onSubmit={(e) => void handleNovoCliente(e)} className="space-y-4">
          <div>
            <label htmlFor="novoNome" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="novoNome"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do cliente"
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label htmlFor="novoWhatsapp" className="text-sm font-medium text-foreground">
              WhatsApp
            </label>
            <input
              id="novoWhatsapp"
              value={novoWhatsapp}
              onChange={(e) => setNovoWhatsapp(e.target.value)}
              placeholder="(11) 91234-5678"
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label htmlFor="novoProduto" className="text-sm font-medium text-foreground">
              Produto de interesse
            </label>
            <select
              id="novoProduto"
              value={novoProduto}
              onChange={(e) => setNovoProduto(e.target.value)}
              className={fieldClass}
            >
              {produtoOptions.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Salvar cliente
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        size="lg"
        title="Importar clientes via CSV"
        description="Faça upload do arquivo, confira a prévia e confirme a importação."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Escolher arquivo CSV
            </button>
            <button
              type="button"
              onClick={downloadCustomerCsvTemplate}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Baixar modelo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Colunas: nome, telefone, produto, data_compra. Aceita vírgula ou ponto e vírgula.
            Telefones iguais atualizam o cliente existente. data_compra no formato DD/MM/AAAA.
          </p>

          {csvFileName && (
            <p className="text-sm text-foreground">
              Arquivo: <span className="font-medium">{csvFileName}</span>
              {csvPreview.length > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  · {csvPreview.length} linha(s) válida(s)
                </span>
              )}
            </p>
          )}

          {csvErrors.length > 0 && (
            <div className="max-h-28 overflow-y-auto rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {csvErrors.slice(0, 8).map((err) => (
                <p key={err}>{err}</p>
              ))}
              {csvErrors.length > 8 && <p>…e mais {csvErrors.length - 8} aviso(s).</p>}
            </div>
          )}

          {csvResult && (
            <p className="rounded-xl border border-border bg-accent/50 px-3 py-2 text-sm text-foreground">
              {csvResult}
            </p>
          )}

          {csvPreview.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Telefone</th>
                    <th className="px-3 py-2 font-medium">Produto</th>
                    <th className="px-3 py-2 font-medium">Data compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {csvPreview.slice(0, 20).map((row) => (
                    <tr key={row.telefoneDigits}>
                      <td className="px-3 py-2">{row.nome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.telefone}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.produto}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.dataCompraLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvPreview.length > 20 && (
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  Mostrando 20 de {csvPreview.length} linhas.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCsvModalOpen(false)}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={csvPreview.length === 0 || csvImporting}
              onClick={confirmCsvImport}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {csvImporting
                ? 'Importando…'
                : `Importar ${csvPreview.length || ''} cliente(s)`}
            </button>
          </div>
        </div>
      </Modal>

      {tenantCtx && (
        <ImportCenter
          open={importCenterOpen}
          onClose={() => {
            setImportCenterOpen(false);
            void reloadApiCustomers();
          }}
          tenantId={tenantCtx.tenantId}
          storeId={tenantCtx.storeId}
        />
      )}
    </div>
  );
}

type ClienteActionsProps = {
  cliente: MockCustomer;
  menuOpen: boolean;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  onToggleMenu: () => void;
  onNavigate: (acao: MenuAcao) => void;
  onRemove: () => void;
};

function ClienteCard({
  cliente,
  menuOpen,
  menuRef,
  onToggleMenu,
  onNavigate,
  onRemove,
}: ClienteActionsProps) {
  const detailUrl = `/painel/clientes/${cliente.id}`;

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <Link href={detailUrl} className="min-w-0">
          <p className="truncate font-medium text-foreground">{cliente.displayName}</p>
          <p className="text-xs text-muted-foreground">{cliente.phoneMasked}</p>
        </Link>
        <StatusBadge label={cliente.status} tone={STATUS_TONE[cliente.status]} />
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="text-foreground/70">Produto · </span>
          {cliente.produto}
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span>Compra {cliente.compra}</span>
          <span>Disparo {cliente.disparo}</span>
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={detailUrl}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary"
        >
          Ver ficha
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            title="Mais ações"
            onClick={onToggleMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-border bg-card py-1 shadow-[var(--shadow-soft)]">
              <MenuItem label="Ver ficha" onClick={() => onNavigate('ficha')} />
              <MenuItem label="Registrar interesse" onClick={() => onNavigate('interesse')} />
              <MenuItem label="Ver histórico" onClick={() => onNavigate('historico')} />
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                onClick={onRemove}
                className="flex w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Remover
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ClienteRow({
  cliente,
  menuOpen,
  menuRef,
  onToggleMenu,
  onNavigate,
  onRemove,
}: ClienteActionsProps) {
  const detailUrl = `/painel/clientes/${cliente.id}`;

  return (
    <tr className="group transition hover:bg-muted/40">
      <td className="px-5 py-3.5">
        <Link href={detailUrl} className="block">
          <p className="font-medium text-foreground transition group-hover:text-primary">
            {cliente.displayName}
          </p>
          <p className="text-xs text-muted-foreground">{cliente.phoneMasked}</p>
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <Link href={detailUrl} className="text-muted-foreground transition hover:text-primary">
          {cliente.produto}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <Link href={detailUrl} className="text-muted-foreground transition hover:text-primary">
          {cliente.compra}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <Link href={detailUrl} className="text-muted-foreground transition hover:text-primary">
          {cliente.disparo}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge label={cliente.status} tone={STATUS_TONE[cliente.status]} />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <Link
            href={detailUrl}
            title="Ver ficha"
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary transition hover:bg-primary/10"
          >
            Ver ficha
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              title="Mais ações"
              onClick={onToggleMenu}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-border bg-card py-1 shadow-[var(--shadow-soft)]">
                <MenuItem label="Ver ficha" onClick={() => onNavigate('ficha')} />
                <MenuItem label="Registrar interesse" onClick={() => onNavigate('interesse')} />
                <MenuItem label="Ver histórico" onClick={() => onNavigate('historico')} />
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  onClick={onRemove}
                  className="flex w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
    >
      {label}
    </button>
  );
}
