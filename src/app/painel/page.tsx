'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { KpiCard } from '@/components/painel/kpi-card';
import { PageHeader } from '@/components/painel/page-header';
import { MOCK_PRODUCTS, PRODUCT_CATEGORIES } from '@/lib/mock-customers';
import { exportDashboardPdf } from '@/lib/export-dashboard-pdf';
import {
  aggregateByCategory,
  filterProductPerformance,
  formatPct,
  getProductPerformance,
  sumPerformance,
  type ProductPerf,
} from '@/lib/mock-dashboard';
import {
  fetchAuthMe,
  getDashboardMetrics,
  getStoredAccessToken,
  resolveTenantContext,
  type DashboardMetrics,
} from '@/lib/api';

type PeriodKey = '7d' | '30d' | 'mes' | '90d';

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const PERIOD_CHIPS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: 'mes', label: 'Este mês', days: new Date().getDate() },
  { key: '90d', label: '90 dias', days: 90 },
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function formatCurrencyCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function downsampleSeries<T>(items: T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return items;
  const step = (items.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(items[Math.round(i * step)]!);
  }
  return out;
}

/** "20/06" or "20/06/2026" → day number for narrow charts */
function shortChartLabel(label: string) {
  const day = label.split('/')[0]?.trim();
  return day && day.length <= 2 ? day : label.slice(0, 2);
}

function BarChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 h-40 w-full sm:mt-5 sm:h-48">
      <div className="flex h-full w-full items-end gap-1 sm:gap-1.5">
        {children}
      </div>
    </div>
  );
}

function ChartLabels({ labels }: { labels: string[] }) {
  return (
    <div className="mt-1.5 flex gap-1 sm:gap-1.5">
      {labels.map((label, i) => (
        <span
          key={`${label}-${i}`}
          className="min-w-0 flex-1 text-center text-[10px] leading-none text-muted-foreground"
          title={label}
        >
          {shortChartLabel(label)}
        </span>
      ))}
    </div>
  );
}

export default function PainelDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [de, setDe] = useState(daysAgoIso(29));
  const [ate, setAte] = useState(todayIso());
  const [categoria, setCategoria] = useState('todas');
  const [product, setProduct] = useState('todos');
  const [exporting, setExporting] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [usingApi, setUsingApi] = useState(false);
  const [demoBanner, setDemoBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ownerFirstName, setOwnerFirstName] = useState('');

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    void fetchAuthMe(token)
      .then(({ user }) => {
        const first = (user.ownerName || '').trim().split(/\s+/)[0] || '';
        setOwnerFirstName(first);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let first = true;
    const load = async () => {
      if (first) setLoading(true);
      const ctx = await resolveTenantContext();
      if (cancelled) return;
      if (!ctx.tenantId || !ctx.storeId) {
        setDemoBanner(true);
        setUsingApi(false);
        if (first) setLoading(false);
        first = false;
        return;
      }
      try {
        const data = await getDashboardMetrics(
          ctx.tenantId,
          ctx.storeId,
          de,
          ate,
        );
        if (cancelled) return;
        setMetrics(data);
        setUsingApi(true);
        setDemoBanner(false);
      } catch {
        if (cancelled) return;
        setUsingApi(false);
        setDemoBanner(true);
      } finally {
        if (!cancelled && first) setLoading(false);
        first = false;
      }
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(() => void load(), 20000);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, [de, ate]);

  const allPerf = useMemo((): ProductPerf[] => {
    if (usingApi && metrics) {
      return metrics.topProducts.map((p) => ({
        productId: p.productId,
        nome: p.nome,
        categoria: p.categoria,
        contatos: p.contatos,
        interesses: p.interesses,
        retornos: p.retornos,
        receitaCents: p.receitaCents,
      }));
    }
    return getProductPerformance(period);
  }, [usingApi, metrics, period]);

  const productOptions = useMemo(() => {
    if (usingApi && metrics) {
      return metrics.topProducts
        .filter((p) => categoria === 'todas' || p.categoria === categoria)
        .map((p) => ({ id: p.productId, nome: p.nome, categoria: p.categoria }));
    }
    return categoria === 'todas'
      ? MOCK_PRODUCTS
      : MOCK_PRODUCTS.filter((p) => p.categoria === categoria);
  }, [usingApi, metrics, categoria]);

  const categoryOptions = useMemo(() => {
    if (usingApi && metrics) {
      const set = new Set(metrics.categories.map((c) => c.categoria));
      return [...set];
    }
    return [...PRODUCT_CATEGORIES];
  }, [usingApi, metrics]);

  const filteredPerf = useMemo(
    () => filterProductPerformance(allPerf, categoria, product),
    [allPerf, categoria, product],
  );

  const totals = useMemo(() => {
    if (usingApi && metrics && categoria === 'todas' && product === 'todos') {
      return {
        contatos: metrics.kpis.messagesSent,
        interesses: metrics.kpis.interests,
        retornos: metrics.kpis.returnedCustomers,
        receitaCents: metrics.kpis.recoveredRevenueCents,
      };
    }
    return sumPerformance(filteredPerf);
  }, [usingApi, metrics, filteredPerf, categoria, product]);

  const series = useMemo(() => {
    if (usingApi && metrics) {
      return metrics.series.map((p) => ({
        label: p.label,
        receita: Math.round(p.receitaCents / 100),
        envios: p.envios,
        retornos: p.retornos,
      }));
    }
    return [];
  }, [usingApi, metrics]);

  const categoryPerf = useMemo(() => {
    if (usingApi && metrics && categoria === 'todas' && product === 'todos') {
      return metrics.categories.map((c) => ({
        ...c,
        produtos: metrics.topProducts.filter((p) => p.categoria === c.categoria)
          .length,
      }));
    }
    return aggregateByCategory(filteredPerf);
  }, [usingApi, metrics, filteredPerf, categoria, product]);

  const topProducts = useMemo(
    () =>
      [...filteredPerf].sort((a, b) => {
        if (b.retornos !== a.retornos) return b.retornos - a.retornos;
        return b.interesses - a.interesses;
      }),
    [filteredPerf],
  );

  const bestProduct = topProducts[0];
  const bestCategory = categoryPerf[0];
  const taxaRetorno =
    usingApi && metrics && categoria === 'todas' && product === 'todos'
      ? metrics.kpis.returnRate
      : totals.contatos > 0
        ? totals.retornos / totals.contatos
        : 0;

  const readyToContact =
    usingApi && metrics ? metrics.kpis.readyToContact : undefined;
  const pendingRevenueCents =
    usingApi && metrics ? metrics.kpis.pendingRevenueCents : undefined;
  const commissionCents =
    usingApi && metrics ? metrics.kpis.commissionCents : undefined;
  const merchantRecoveredCents =
    usingApi && metrics ? metrics.kpis.merchantRecoveredCents : undefined;
  const salesConfirmed =
    usingApi && metrics ? metrics.kpis.salesConfirmed : undefined;
  const clickToPurchaseRate =
    usingApi && metrics ? metrics.kpis.clickToPurchaseRate : undefined;
  const recentSales =
    usingApi && metrics ? metrics.recentSales ?? [] : [];
  const funnel = usingApi && metrics ? metrics.funnel : null;

  function selectPeriod(key: PeriodKey) {
    setPeriod(key);
    const chip = PERIOD_CHIPS.find((c) => c.key === key);
    const days = chip?.days ?? 30;
    setDe(daysAgoIso(Math.max(days - 1, 0)));
    setAte(todayIso());
  }

  function handleCategoriaChange(value: string) {
    setCategoria(value);
    setProduct('todos');
  }

  const totalReceita = useMemo(
    () => series.reduce((sum, p) => sum + p.receita, 0),
    [series],
  );
  const totalEnvios = useMemo(
    () => series.reduce((sum, p) => sum + p.envios, 0),
    [series],
  );
  const totalRetornos = useMemo(
    () => series.reduce((sum, p) => sum + p.retornos, 0),
    [series],
  );

  // Fewer points on mobile-friendly charts (still uses full series for totals)
  const chartSeries = useMemo(
    () => downsampleSeries(series, 12),
    [series],
  );
  const chartMaxReceita = Math.max(...chartSeries.map((p) => p.receita), 1);
  const chartMaxEnvios = Math.max(
    ...chartSeries.map((p) => Math.max(p.envios, p.retornos)),
    1,
  );
  const maxCategoryReceita = Math.max(
    ...categoryPerf.map((c) => c.receitaCents),
    1,
  );

  const filterHint =
    product !== 'todos'
      ? product
      : categoria !== 'todas'
        ? `categoria ${categoria}`
        : 'todos os produtos';

  const periodLabel =
    PERIOD_CHIPS.find((chip) => chip.key === period)?.label ?? period;

  function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      exportDashboardPdf({
        periodLabel,
        de,
        ate,
        filterLabel: filterHint,
        totals: {
          receitaCents: totals.receitaCents,
          contatos: totals.contatos,
          interesses: totals.interesses,
          retornos: totals.retornos,
          taxaRetorno,
        },
        products: topProducts,
        categories: categoryPerf,
        bestProductName: bestProduct?.nome,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <PageHeader
        title={ownerFirstName ? `Olá, ${ownerFirstName}` : 'Dashboard'}
        subtitle="Acompanhe o que está voltando — e o próximo passo para recuperar vendas."
        actions={
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] transition hover:bg-muted disabled:opacity-60"
          >
            {exporting ? 'Gerando PDF…' : 'Exportar PDF'}
          </button>
        }
      />

      {demoBanner && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-card px-4 py-3 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Seu painel ainda está vazio de vendas reais
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Importe a base da loja — é o caminho mais curto até a 1ª recuperação.
            </p>
          </div>
          <Link
            href="/painel/clientes?import=1"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Importar agora
          </Link>
        </div>
      )}

      {usingApi &&
        !demoBanner &&
        (merchantRecoveredCents ?? 0) === 0 &&
        (salesConfirmed ?? 0) === 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-card px-4 py-3 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Ainda sem a 1ª venda recuperada
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Siga o checklist: Mercado Pago → base → regras. WhatsApp é opcional. A recuperação fica com a Voltou.
              </p>
            </div>
            <Link
              href="/painel/regras"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Definir regras
            </Link>
          </div>
        )}

      {usingApi && (merchantRecoveredCents ?? 0) > 0 && recentSales[0] && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 shadow-[var(--shadow-soft)]">
          <p className="font-semibold">
            +{formatCurrencyCents(merchantRecoveredCents ?? 0)} recuperados no
            período
          </p>
          <p className="mt-0.5 text-emerald-900/80">
            Última: {recentSales[0].customerName} ·{' '}
            {recentSales[0].productName} ·{' '}
            {formatCurrencyCents(recentSales[0].merchantCents)}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card/90 p-3 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:max-w-[10rem]">
              De
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:max-w-[10rem]">
              Até
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <div className="flex gap-2 overflow-x-auto scroll-touch pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PERIOD_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => selectPeriod(chip.key)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  period === chip.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Categoria
              <select
                value={categoria}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="todas">Todas as categorias</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Produto
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="todos">Todos os produtos</option>
                {productOptions.map((opt) => (
                  <option key={opt.id} value={opt.nome}>
                    {opt.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {loading
            ? 'Carregando métricas…'
            : <>
                Filtrando por <span className="font-medium text-foreground">{filterHint}</span>
                {usingApi ? ' · dados da sua loja' : ' · demonstração'}
              </>}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <KpiCard
          emphasis
          label="Recuperado (lojista)"
          value={formatCurrencyCents(
            merchantRecoveredCents ?? totals.receitaCents,
          )}
          hint={
            commissionCents != null
              ? `Bruto ${formatCurrencyCents(totals.receitaCents)} · Voltou ${formatCurrencyCents(commissionCents)}`
              : undefined
          }
          tone="positive"
        />
        <KpiCard
          label="Vendas confirmadas"
          value={
            salesConfirmed != null
              ? salesConfirmed.toLocaleString('pt-BR')
              : totals.retornos.toLocaleString('pt-BR')
          }
          hint="via link rastreado"
          tone="positive"
        />
        <KpiCard
          label="Conversão clique→compra"
          value={
            clickToPurchaseRate != null
              ? formatPct(clickToPurchaseRate)
              : '—'
          }
          hint={
            funnel?.checkoutsClicked != null
              ? `${funnel.checkoutsPaid} pagas / ${funnel.checkoutsClicked} cliques`
              : undefined
          }
        />
        <KpiCard
          label="Mensagens enviadas"
          value={totals.contatos.toLocaleString('pt-BR')}
        />
        <KpiCard
          label="Prontos para recuperar"
          value={
            readyToContact != null
              ? readyToContact.toLocaleString('pt-BR')
              : '—'
          }
          hint={
            pendingRevenueCents != null
              ? `${formatCurrencyCents(pendingRevenueCents)} em potencial`
              : 'aguardando envio'
          }
        />
      </section>

      {recentSales.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Vendas recentes
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirmadas via checkout rastreado no período.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Cliente</th>
                  <th className="pb-2 pr-3 font-medium">Produto</th>
                  <th className="pb-2 pr-3 font-medium">Valor</th>
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 text-foreground">
                      {s.customerName}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {s.productName}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      {formatCurrencyCents(s.merchantCents)}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {new Date(s.soldAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {s.status === 'completed' ? 'Confirmada' : s.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {funnel && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">Funil de recuperação</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Contatados → interessados → checkout → pago
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {[
              { label: 'Contatados', value: funnel.contacted, emphasis: false },
              { label: 'Interessados', value: funnel.interested, emphasis: false },
              { label: 'Checkouts', value: funnel.checkoutsSent, emphasis: false },
              { label: 'Pagos', value: funnel.checkoutsPaid, emphasis: true },
            ].map((step) => (
              <div
                key={step.label}
                className={`rounded-xl px-3 py-3 ${
                  step.emphasis
                    ? 'border border-primary/25 bg-gradient-to-br from-accent to-card shadow-sm'
                    : 'border border-border bg-muted/40'
                }`}
              >
                <p
                  className={`text-xs ${
                    step.emphasis ? 'font-medium text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`mt-1 text-xl font-semibold ${
                    step.emphasis ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {step.value.toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {chartSeries.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Receita recuperada
              </h2>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(totalReceita)}
              </span>
            </div>
            <BarChartFrame>
              {chartSeries.map((point) => {
                const pct =
                  point.receita > 0
                    ? Math.max((point.receita / chartMaxReceita) * 100, 8)
                    : 0;
                return (
                  <div
                    key={`r-${point.label}`}
                    className="flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <div
                      title={formatCurrency(point.receita)}
                      className="mx-auto w-full max-w-5 rounded-t-md bg-gradient-to-t from-primary to-chart-2 sm:max-w-none"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </BarChartFrame>
            <ChartLabels labels={chartSeries.map((p) => p.label)} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Envios x Respostas
              </h2>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-primary/60" />{' '}
                  envios
                </span>
                {' · '}
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-success" />{' '}
                  respostas
                </span>
              </p>
            </div>
            <BarChartFrame>
              {chartSeries.map((point) => {
                const enviosPct =
                  point.envios > 0
                    ? Math.max((point.envios / chartMaxEnvios) * 100, 8)
                    : 0;
                const respPct =
                  point.retornos > 0
                    ? Math.max((point.retornos / chartMaxEnvios) * 100, 8)
                    : 0;
                return (
                  <div
                    key={`e-${point.label}`}
                    className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
                  >
                    <div
                      title={`${point.envios} envios`}
                      className="w-[45%] max-w-3 rounded-t-sm bg-primary/55 sm:max-w-none"
                      style={{ height: `${enviosPct}%` }}
                    />
                    <div
                      title={`${point.retornos} respostas`}
                      className="w-[45%] max-w-3 rounded-t-sm bg-success sm:max-w-none"
                      style={{ height: `${respPct}%` }}
                    />
                  </div>
                );
              })}
            </BarChartFrame>
            <ChartLabels labels={chartSeries.map((p) => p.label)} />
            <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
              {totalEnvios.toLocaleString('pt-BR')} envios ·{' '}
              {totalRetornos.toLocaleString('pt-BR')} respostas
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-accent p-5 shadow-[var(--shadow-soft)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary">
              Maior retorno
            </div>
            <h3 className="mt-3 text-xl font-semibold text-foreground">
              {bestProduct?.nome ?? '—'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {bestProduct
                ? `${bestProduct.retornos} retornos, ${bestProduct.interesses} interesses.`
                : 'Sem dados no filtro atual.'}
            </p>
            {bestCategory && product === 'todos' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Melhor categoria:{' '}
                <span className="font-medium text-foreground">{bestCategory.categoria}</span>
              </p>
            )}
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">
            {bestProduct ? formatCurrencyCents(bestProduct.receitaCents) : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Top produtos no período</h2>

          {/* Mobile cards — scan-friendly */}
          <ul className="mt-4 space-y-2 lg:hidden">
            {topProducts.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nenhum produto neste filtro.
              </li>
            ) : (
              topProducts.map((p) => (
                <li
                  key={p.productId}
                  className="rounded-xl border border-border bg-muted/30 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.categoria}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-primary">
                      {formatCurrencyCents(p.receitaCents)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{p.contatos} contatos</span>
                    <span>{p.interesses} interesses</span>
                    <span className="font-medium text-success">
                      {p.retornos} retornos (
                      {formatPct(p.contatos > 0 ? p.retornos / p.contatos : 0)})
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="mt-4 hidden overflow-x-auto scroll-touch lg:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Produto</th>
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Contatos</th>
                  <th className="pb-2 font-medium">Interesses</th>
                  <th className="pb-2 font-medium">Retornos</th>
                  <th className="pb-2 font-medium">Receita</th>
                  <th className="pb-2 font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Nenhum produto neste filtro.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td className="py-2.5 font-medium text-foreground">{p.nome}</td>
                      <td className="py-2.5 text-muted-foreground">{p.categoria}</td>
                      <td className="py-2.5 text-muted-foreground">{p.contatos}</td>
                      <td className="py-2.5 text-muted-foreground">{p.interesses}</td>
                      <td className="py-2.5 text-muted-foreground">{p.retornos}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatCurrencyCents(p.receitaCents)}
                      </td>
                      <td className="py-2.5 text-success">
                        {formatPct(p.contatos > 0 ? p.retornos / p.contatos : 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-foreground">Performance por categoria</h2>
        <div className="mt-5 space-y-3">
          {categoryPerf.map((cat) => (
            <div key={cat.categoria}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{cat.categoria}</span>
                <span className="text-xs text-muted-foreground">
                  {cat.interesses} interesses · {cat.retornos} retornos ·{' '}
                  {formatCurrencyCents(cat.receitaCents)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.max((cat.receitaCents / maxCategoryReceita) * 100, 4)}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {categoryPerf.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem categorias neste filtro.</p>
          )}
        </div>
      </section>
    </div>
  );
}
