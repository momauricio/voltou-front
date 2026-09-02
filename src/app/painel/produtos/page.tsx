'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/painel/page-header';
import { Modal } from '@/components/painel/modal';
import { StatusBadge } from '@/components/painel/status-badge';
import {
  downloadProductCsvTemplate,
  parseProductCsv,
  type ProductCsvRow,
} from '@/lib/csv-products';
import { ImportCenter } from '@/components/painel/import-center';
import { BlingStockCard } from '@/components/painel/bling-stock-card';
import { StockIntegrationsMenu } from '@/components/painel/stock-integrations-menu';
import {
  createApiProduct,
  getStoredAccessToken,
  getStoredTenantContext,
  listApiProducts,
  resolveTenantContext,
  updateApiProduct,
  type ApiProduct,
} from '@/lib/api';
import {
  lojistaApiLoadError,
  lojistaDemoBannerVisible,
} from '@/lib/lojista-panel-ux';

type ProdutoStatus = 'Ativo' | 'Esgotado' | 'Inativo';

type Produto = {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  preco: number;
  /** Custo (opcional) — usado no piso de venda da IA */
  custo: number | null;
  /** Desconto máximo em % (null = padrão da loja) */
  descontoMax: number | null;
  disponivel: boolean;
  iaPodeVender: boolean;
  estoque: number;
  status: ProdutoStatus;
};

const CATEGORIAS = ['Tênis', 'Roupas', 'Acessórios', 'Meias', 'Bolsas', 'Geral'];

/** Desconto máximo padrão da loja quando o produto não define o seu (%). */
const DESCONTO_MAX_PADRAO = 30;
/** Comissão da Voltou usada no piso (5%). */
const COMISSAO = 0.05;

const STATUS_TONE: Record<ProdutoStatus, 'success' | 'warning' | 'muted' | 'danger'> = {
  Ativo: 'success',
  Esgotado: 'warning',
  Inativo: 'muted',
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusFromEstoque(estoque: number): ProdutoStatus {
  return estoque > 0 ? 'Ativo' : 'Esgotado';
}

function mapApiProduct(p: ApiProduct): Produto {
  const status: ProdutoStatus = !p.active
    ? 'Inativo'
    : p.availability === 'unavailable' || p.stock <= 0
      ? 'Esgotado'
      : 'Ativo';
  return {
    id: p.id,
    nome: p.name,
    sku: p.sku ?? '—',
    categoria: p.category ?? 'Geral',
    preco: p.priceCents / 100,
    custo: p.costCents != null ? p.costCents / 100 : null,
    descontoMax:
      p.maxDiscountBps != null ? Math.round(p.maxDiscountBps / 100) : null,
    disponivel: p.availability === 'available',
    iaPodeVender: p.sellableByAi,
    estoque: p.stock,
    status,
  };
}

/**
 * Piso de venda: o maior entre o preço com desconto máximo aplicado e o
 * custo "grossed up" pela comissão — a IA nunca negocia abaixo disso.
 */
function pisoDeVenda(p: Pick<Produto, 'preco' | 'custo' | 'descontoMax'>): number {
  const descMax = (p.descontoMax ?? DESCONTO_MAX_PADRAO) / 100;
  const pisoDesconto = p.preco * (1 - descMax);
  const pisoCusto = p.custo != null && p.custo > 0 ? p.custo / (1 - COMISSAO) : 0;
  return Math.min(p.preco, Math.max(pisoDesconto, pisoCusto));
}

export default function ProdutosPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando…</div>}>
      <ProdutosPageInner />
    </Suspense>
  );
}

function ProdutosPageInner() {
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [usingApi, setUsingApi] = useState(false);
  const [apiErro, setApiErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [ordem, setOrdem] = useState('recentes');
  const [status, setStatus] = useState('todos');
  const [categoria, setCategoria] = useState('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tenantCtx, setTenantCtx] = useState<{
    tenantId: string;
    storeId: string;
  } | null>(null);
  const showDemoBanner = lojistaDemoBannerVisible({
    accessToken: getStoredAccessToken(),
  });

  const [novoNome, setNovoNome] = useState('');
  const [novoSku, setNovoSku] = useState('');
  const [novaCategoria, setNovaCategoria] = useState(CATEGORIAS[0]);
  const [novoPreco, setNovoPreco] = useState('');
  const [novoEstoque, setNovoEstoque] = useState('');
  const [novoCusto, setNovoCusto] = useState('');
  const [novoDescontoMax, setNovoDescontoMax] = useState('');
  const [novoDisponivel, setNovoDisponivel] = useState(true);
  const [novoIaPodeVender, setNovoIaPodeVender] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<ProductCsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  async function reloadProducts(tenantId: string, storeId: string) {
    const list = await listApiProducts(tenantId, storeId);
    setProdutos(list.map(mapApiProduct));
    setUsingApi(true);
    setApiErro(null);
  }

  useEffect(() => {
    let cancelled = false;
    void resolveTenantContext().then(async (ctx) => {
      if (cancelled) return;
      if (!ctx.tenantId || !ctx.storeId) {
        setApiErro(lojistaApiLoadError());
        setLoading(false);
        return;
      }
      setTenantCtx({ tenantId: ctx.tenantId, storeId: ctx.storeId });
      try {
        await reloadProducts(ctx.tenantId, ctx.storeId);
      } catch (err) {
        if (cancelled) return;
        setProdutos([]);
        setApiErro(
          lojistaApiLoadError(err instanceof Error ? err.message : undefined),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtrados = useMemo(() => {
    let lista = produtos.filter((p) => {
      const matchSearch =
        search.trim() === '' ||
        p.nome.toLowerCase().includes(search.trim().toLowerCase()) ||
        p.sku.toLowerCase().includes(search.trim().toLowerCase());
      const matchStatus = status === 'todos' || p.status === status;
      const matchCategoria = categoria === 'todas' || p.categoria === categoria;
      return matchSearch && matchStatus && matchCategoria;
    });

    if (ordem === 'nome') {
      lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (ordem === 'preco') {
      lista = [...lista].sort((a, b) => b.preco - a.preco);
    } else if (ordem === 'estoque') {
      lista = [...lista].sort((a, b) => b.estoque - a.estoque);
    }

    return lista;
  }, [produtos, search, status, categoria, ordem]);

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

  function resetForm() {
    setEditingId(null);
    setNovoNome('');
    setNovoSku('');
    setNovaCategoria(CATEGORIAS[0]);
    setNovoPreco('');
    setNovoEstoque('');
    setNovoCusto('');
    setNovoDescontoMax('');
    setNovoDisponivel(true);
    setNovoIaPodeVender(true);
  }

  function openNovoProduto() {
    resetForm();
    setModalOpen(true);
  }

  function openEditarProduto(p: Produto) {
    setEditingId(p.id);
    setNovoNome(p.nome);
    setNovoSku(p.sku);
    setNovaCategoria(p.categoria);
    setNovoPreco(p.preco.toFixed(2).replace('.', ','));
    setNovoEstoque(String(p.estoque));
    setNovoCusto(p.custo != null ? p.custo.toFixed(2).replace('.', ',') : '');
    setNovoDescontoMax(p.descontoMax != null ? String(p.descontoMax) : '');
    setNovoDisponivel(p.disponivel);
    setNovoIaPodeVender(p.iaPodeVender);
    setModalOpen(true);
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
      const parsed = parseProductCsv(text);
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

    setProdutos((prev) => {
      const bySku = new Map(prev.map((p) => [p.sku.toUpperCase(), p]));
      let updated = [...prev];
      let created = 0;
      let replaced = 0;

      for (const row of csvPreview) {
        const sku = row.sku.toUpperCase();
        const existing = bySku.get(sku);
        const next: Produto = {
          id: existing?.id ?? crypto.randomUUID(),
          nome: row.nome,
          sku,
          categoria: row.categoria,
          preco: row.preco,
          custo: existing?.custo ?? null,
          descontoMax: existing?.descontoMax ?? null,
          disponivel: existing?.disponivel ?? row.estoque > 0,
          iaPodeVender: existing?.iaPodeVender ?? true,
          estoque: row.estoque,
          status: statusFromEstoque(row.estoque),
        };
        if (existing) {
          updated = updated.map((p) => (p.sku.toUpperCase() === sku ? next : p));
          replaced += 1;
        } else {
          updated = [next, ...updated];
          bySku.set(sku, next);
          created += 1;
        }
      }

      queueMicrotask(() => {
        setCsvResult(
          `${created} produto(s) novos · ${replaced} atualizado(s) pelo SKU.`,
        );
        setCsvImporting(false);
        setCsvPreview([]);
        setCsvFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });

      return updated;
    });
  }

  async function handleSalvarProduto(e: FormEvent) {
    e.preventDefault();
    const precoNum = Number(novoPreco.replace(',', '.'));
    const estoqueNum = Number(novoEstoque);
    const custoNum = novoCusto.trim() ? Number(novoCusto.replace(',', '.')) : null;
    const descontoNum = novoDescontoMax.trim() ? Number(novoDescontoMax) : null;
    if (!novoNome.trim() || !novoSku.trim() || Number.isNaN(precoNum)) return;

    const base: Omit<Produto, 'id'> = {
      nome: novoNome.trim(),
      sku: novoSku.trim().toUpperCase(),
      categoria: novaCategoria,
      preco: precoNum,
      custo: custoNum != null && !Number.isNaN(custoNum) ? custoNum : null,
      descontoMax:
        descontoNum != null && !Number.isNaN(descontoNum)
          ? Math.min(100, Math.max(0, descontoNum))
          : null,
      disponivel: novoDisponivel,
      iaPodeVender: novoIaPodeVender,
      estoque: Number.isNaN(estoqueNum) ? 0 : estoqueNum,
      status: statusFromEstoque(Number.isNaN(estoqueNum) ? 0 : estoqueNum),
    };

    if (tenantCtx && usingApi) {
      setSaving(true);
      try {
        const payload = {
          name: base.nome,
          sku: base.sku,
          category: base.categoria,
          priceCents: Math.round(base.preco * 100),
          costCents:
            base.custo != null ? Math.round(base.custo * 100) : null,
          maxDiscountBps:
            base.descontoMax != null ? Math.round(base.descontoMax * 100) : null,
          availability: base.disponivel
            ? ('available' as const)
            : ('unavailable' as const),
          sellableByAi: base.iaPodeVender,
          stock: base.estoque,
          active: base.status !== 'Inativo',
        };
        if (editingId) {
          await updateApiProduct(tenantCtx.tenantId, editingId, payload);
        } else {
          await createApiProduct({
            tenantId: tenantCtx.tenantId,
            storeId: tenantCtx.storeId,
            ...payload,
            costCents: payload.costCents ?? undefined,
            maxDiscountBps: payload.maxDiscountBps ?? undefined,
          });
        }
        await reloadProducts(tenantCtx.tenantId, tenantCtx.storeId);
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Erro ao salvar produto.',
        );
        setSaving(false);
        return;
      }
      setSaving(false);
    } else if (editingId) {
      setProdutos((prev) =>
        prev.map((p) => (p.id === editingId ? { ...base, id: editingId } : p)),
      );
    } else {
      setProdutos((prev) => [{ ...base, id: crypto.randomUUID() }, ...prev]);
    }
    resetForm();
    setModalOpen(false);
  }

  async function handleDesativar(id: string) {
    if (tenantCtx && usingApi) {
      try {
        await updateApiProduct(tenantCtx.tenantId, id, { active: false });
        await reloadProducts(tenantCtx.tenantId, tenantCtx.storeId);
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Erro ao desativar produto.',
        );
      }
      return;
    }
    setProdutos((prev) => prev.filter((item) => item.id !== id));
  }

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  const pisoAtual = (() => {
    const precoNum = Number(novoPreco.replace(',', '.'));
    if (Number.isNaN(precoNum) || precoNum <= 0) return null;
    const custoNum = novoCusto.trim() ? Number(novoCusto.replace(',', '.')) : null;
    const descontoNum = novoDescontoMax.trim() ? Number(novoDescontoMax) : null;
    return pisoDeVenda({
      preco: precoNum,
      custo: custoNum != null && !Number.isNaN(custoNum) ? custoNum : null,
      descontoMax:
        descontoNum != null && !Number.isNaN(descontoNum) ? descontoNum : null,
    });
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        subtitle={`${produtos.length} cadastrados · ${filtrados.length} exibidos`}
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
            <Suspense fallback={null}>
              <StockIntegrationsMenu
                tenantId={tenantCtx?.tenantId ?? null}
                storeId={tenantCtx?.storeId ?? null}
              />
            </Suspense>
            <button
              type="button"
              onClick={openNovoProduto}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Novo produto
            </button>
          </>
        }
      />

      {showDemoBanner ? (
        <p className="text-sm text-muted-foreground">Faça login para ver o catálogo da loja.</p>
      ) : null}
      {apiErro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {apiErro}
        </div>
      )}
      {loading && !apiErro ? (
        <p className="text-sm text-muted-foreground">Carregando produtos…</p>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-1">
            Buscar
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou SKU"
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
              <option value="preco">Maior preço</option>
              <option value="estoque">Maior estoque</option>
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
              <option value="Ativo">Ativo</option>
              <option value="Esgotado">Esgotado</option>
              <option value="Inativo">Inativo</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Categoria
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="todas">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <ul className="space-y-2 lg:hidden">
        {filtrados.length === 0 ? (
          <li className="rounded-2xl border border-border bg-card px-4 py-10 text-center shadow-[var(--shadow-soft)]">
            <p className="text-sm text-muted-foreground">
              {usingApi && produtos.length === 0
                ? 'Nenhum produto na loja ainda.'
                : 'Nenhum produto encontrado com esses filtros.'}
            </p>
            {usingApi && produtos.length === 0 && (
              <Link
                href="/painel/produtos?import=1"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Importar catálogo
              </Link>
            )}
          </li>
        ) : (
          filtrados.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku} · {p.categoria}
                  </p>
                </div>
                <StatusBadge label={p.status} tone={STATUS_TONE[p.status]} />
              </div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-primary">
                    {formatCurrency(p.preco)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Piso {formatCurrency(pisoDeVenda(p))} · estoque {p.estoque}
                  </p>
                </div>
                {p.iaPodeVender && p.disponivel ? (
                  <StatusBadge label="IA pode vender" tone="success" />
                ) : !p.disponivel ? (
                  <StatusBadge label="Indisponível" tone="warning" />
                ) : (
                  <StatusBadge label="IA bloqueada" tone="muted" />
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditarProduto(p)}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-primary/10 text-sm font-medium text-primary"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDesativar(p.id)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground"
                >
                  {usingApi ? 'Desativar' : 'Remover'}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] lg:block">
        <div className="overflow-x-auto scroll-touch">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/60">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Preço</th>
                <th className="px-5 py-3 font-medium" title="Preço mínimo que a IA pode negociar (desconto máx. e comissão considerados)">
                  Piso de venda
                </th>
                <th className="px-5 py-3 font-medium">IA</th>
                <th className="px-5 py-3 font-medium">Estoque</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((p) => (
                <tr key={p.id} className="transition hover:bg-muted/40">
                  <td className="px-5 py-3.5 font-medium text-foreground">{p.nome}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.sku}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.categoria}</td>
                  <td className="px-5 py-3.5 font-medium text-primary">{formatCurrency(p.preco)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {formatCurrency(pisoDeVenda(p))}
                    <span className="ml-1 text-xs">
                      (-{Math.round(((p.preco - pisoDeVenda(p)) / p.preco) * 100)}%)
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.iaPodeVender && p.disponivel ? (
                      <StatusBadge label="Pode vender" tone="success" />
                    ) : !p.disponivel ? (
                      <StatusBadge label="Indisponível" tone="warning" />
                    ) : (
                      <StatusBadge label="Bloqueado" tone="muted" />
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.estoque}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge label={p.status} tone={STATUS_TONE[p.status]} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => openEditarProduto(p)}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title={usingApi ? 'Desativar' : 'Remover'}
                        onClick={() => void handleDesativar(p.id)}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                          <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    {usingApi && produtos.length === 0 ? (
                      <span className="inline-flex flex-col items-center gap-3">
                        Nenhum produto na loja ainda.
                        <Link
                          href="/painel/produtos?import=1"
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                        >
                          Importar catálogo
                        </Link>
                      </span>
                    ) : (
                      'Nenhum produto encontrado com esses filtros.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Suspense fallback={null}>
        <BlingStockCard
          tenantId={tenantCtx?.tenantId ?? null}
          storeId={tenantCtx?.storeId ?? null}
        />
      </Suspense>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8 12 3 3 8l9 5 9-5Z" />
              <path d="M3 8v9l9 5 9-5V8" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Cadastre só o que a IA pode vender — o resto entra sozinho
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Jogue a planilha do seu sistema ou os XMLs das notas fiscais: vendas,
              clientes e produtos são organizados automaticamente.
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
        onClose={() => {
          resetForm();
          setModalOpen(false);
        }}
        size="lg"
        title={editingId ? 'Editar produto' : 'Novo produto'}
        description={
          editingId
            ? 'Ajuste preço, custo e o que a IA pode negociar.'
            : 'Cadastro manual do produto no seu catálogo.'
        }
      >
        <form onSubmit={(e) => void handleSalvarProduto(e)} className="space-y-4">
          <div>
            <label htmlFor="novoNomeProduto" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="novoNomeProduto"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do produto"
              className={fieldClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="novoSku" className="text-sm font-medium text-foreground">
                SKU
              </label>
              <input
                id="novoSku"
                value={novoSku}
                onChange={(e) => setNovoSku(e.target.value)}
                placeholder="PRD-001"
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label htmlFor="novaCategoria" className="text-sm font-medium text-foreground">
                Categoria
              </label>
              <select
                id="novaCategoria"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                className={fieldClass}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="novoPreco" className="text-sm font-medium text-foreground">
                Preço (R$)
              </label>
              <input
                id="novoPreco"
                inputMode="decimal"
                value={novoPreco}
                onChange={(e) => setNovoPreco(e.target.value)}
                placeholder="199,90"
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label htmlFor="novoEstoque" className="text-sm font-medium text-foreground">
                Estoque
              </label>
              <input
                id="novoEstoque"
                inputMode="numeric"
                value={novoEstoque}
                onChange={(e) => setNovoEstoque(e.target.value)}
                placeholder="0"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">Controles da IA</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Defina até onde a IA pode negociar este produto no WhatsApp.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="novoCusto" className="text-sm font-medium text-foreground">
                  Custo (R$) <span className="text-xs text-muted-foreground">opcional</span>
                </label>
                <input
                  id="novoCusto"
                  inputMode="decimal"
                  value={novoCusto}
                  onChange={(e) => setNovoCusto(e.target.value)}
                  placeholder="120,00"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="novoDescontoMax" className="text-sm font-medium text-foreground">
                  Desconto máx. (%){' '}
                  <span className="text-xs text-muted-foreground">
                    padrão {DESCONTO_MAX_PADRAO}%
                  </span>
                </label>
                <input
                  id="novoDescontoMax"
                  inputMode="numeric"
                  value={novoDescontoMax}
                  onChange={(e) => setNovoDescontoMax(e.target.value)}
                  placeholder={String(DESCONTO_MAX_PADRAO)}
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={novoDisponivel}
                  onChange={(e) => setNovoDisponivel(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                />
                Disponível para venda
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={novoIaPodeVender}
                  onChange={(e) => setNovoIaPodeVender(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                />
                IA pode oferecer
              </label>
            </div>
            {pisoAtual != null && (
              <p className="mt-3 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
                Piso de venda:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(pisoAtual)}
                </span>{' '}
                — a IA nunca negocia abaixo disso (desconto máx. e comissão de 5%
                considerados{novoCusto.trim() ? ', sem vender abaixo do custo' : ''}).
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setModalOpen(false);
              }}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
            >
              {saving
                ? 'Salvando…'
                : editingId
                  ? 'Salvar alterações'
                  : 'Salvar produto'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        size="lg"
        title="Importar produtos via CSV"
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
              onClick={downloadProductCsvTemplate}
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
            Colunas: nome, sku, categoria, preco, estoque. Aceita vírgula ou ponto e vírgula.
            SKUs iguais atualizam o produto existente.
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
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Categoria</th>
                    <th className="px-3 py-2 font-medium">Preço</th>
                    <th className="px-3 py-2 font-medium">Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {csvPreview.slice(0, 20).map((row) => (
                    <tr key={`${row.sku}-${row.nome}`}>
                      <td className="px-3 py-2">{row.nome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.sku}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.categoria}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatCurrency(row.preco)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.estoque}</td>
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
                : `Importar ${csvPreview.length || ''} produto(s)`}
            </button>
          </div>
        </div>
      </Modal>

      {tenantCtx && (
        <ImportCenter
          open={importCenterOpen}
          onClose={() => {
            setImportCenterOpen(false);
            void reloadProducts(tenantCtx.tenantId, tenantCtx.storeId).catch(
              () => undefined,
            );
          }}
          tenantId={tenantCtx.tenantId}
          storeId={tenantCtx.storeId}
        />
      )}
    </div>
  );
}
