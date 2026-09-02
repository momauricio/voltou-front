'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { PageHeader } from '@/components/painel/page-header';
import { FulfillmentSettingsCard } from '@/components/painel/fulfillment-settings-card';
import {
  getStoreRules,
  resolveTenantContext,
  saveStoreRules,
  type StoreRules,
} from '@/lib/api';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type Cupom = {
  id: string;
  codigo: string;
  desconto: string;
  validade: string;
};

const CUPONS_INICIAIS: Cupom[] = [
  { id: '1', codigo: 'VOLTA10', desconto: '10%', validade: '31/08/2026' },
  { id: '2', codigo: 'BEMVINDO15', desconto: '15%', validade: 'Sem validade' },
];

function parseDescontoPct(raw: string): number | null {
  const n = Number.parseFloat(raw.replace('%', '').replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function formatDescontoPct(n: number): string {
  return `${n}%`;
}

const DEFAULTS: Required<
  Omit<StoreRules, 'cupons'> & { cupons: Cupom[]; aniversario: boolean }
> = {
  sobreNegocio:
    'Loja de calçados e acessórios esportivos, com foco em corrida e uso urbano. Entregamos em todo o Brasil e valorizamos atendimento rápido e humano.',
  personalidade:
    'Tom amigável e direto, como um vendedor de loja física: cumprimenta pelo nome, é breve e sempre oferece ajuda antes de empurrar uma oferta.',
  instrucoesExtras:
    'Nunca mencionar concorrentes. Se o cliente reclamar de algo, oferecer contato humano imediatamente.',
  horaInicio: '09:00',
  horaFim: '20:00',
  diasAtivos: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  followUpDias: '60',
  descontoPadrao: '10',
  margemMaxima: '20',
  maxDescontoUmProduto: '10',
  maxDescontoDoisOuMais: '15',
  aniversario: true,
  cupons: CUPONS_INICIAIS,
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function applyRules(
  data: StoreRules,
  setters: {
    setSobreNegocio: (v: string) => void;
    setPersonalidade: (v: string) => void;
    setInstrucoesExtras: (v: string) => void;
    setHoraInicio: (v: string) => void;
    setHoraFim: (v: string) => void;
    setDiasAtivos: (v: string[]) => void;
    setFollowUpDias: (v: string) => void;
    setDescontoPadrao: (v: string) => void;
    setMargemMaxima: (v: string) => void;
    setMaxDescontoUmProduto: (v: string) => void;
    setMaxDescontoDoisOuMais: (v: string) => void;
    setAniversario: (v: boolean) => void;
    setCupons: (v: Cupom[]) => void;
  },
) {
  if (data.sobreNegocio) setters.setSobreNegocio(data.sobreNegocio);
  if (data.personalidade) setters.setPersonalidade(data.personalidade);
  if (data.instrucoesExtras) setters.setInstrucoesExtras(data.instrucoesExtras);
  if (data.horaInicio) setters.setHoraInicio(data.horaInicio);
  if (data.horaFim) setters.setHoraFim(data.horaFim);
  if (data.diasAtivos) setters.setDiasAtivos(data.diasAtivos);
  if (data.followUpDias) setters.setFollowUpDias(data.followUpDias);
  if (data.descontoPadrao) setters.setDescontoPadrao(data.descontoPadrao);
  if (data.margemMaxima) setters.setMargemMaxima(data.margemMaxima);
  if (data.maxDescontoUmProduto) setters.setMaxDescontoUmProduto(data.maxDescontoUmProduto);
  if (data.maxDescontoDoisOuMais) setters.setMaxDescontoDoisOuMais(data.maxDescontoDoisOuMais);
  if (typeof data.aniversario === 'boolean') setters.setAniversario(data.aniversario);
  if (data.cupons) setters.setCupons(data.cupons);
}

export default function RegrasPage() {
  const [sobreNegocio, setSobreNegocio] = useState(DEFAULTS.sobreNegocio);
  const [personalidade, setPersonalidade] = useState(DEFAULTS.personalidade);
  const [instrucoesExtras, setInstrucoesExtras] = useState(DEFAULTS.instrucoesExtras);
  const [horaInicio, setHoraInicio] = useState(DEFAULTS.horaInicio);
  const [horaFim, setHoraFim] = useState(DEFAULTS.horaFim);
  const [diasAtivos, setDiasAtivos] = useState<string[]>(DEFAULTS.diasAtivos);
  const [followUpDias, setFollowUpDias] = useState(DEFAULTS.followUpDias);
  const [descontoPadrao, setDescontoPadrao] = useState(DEFAULTS.descontoPadrao);
  const [margemMaxima, setMargemMaxima] = useState(DEFAULTS.margemMaxima);
  const [maxDescontoUmProduto, setMaxDescontoUmProduto] = useState(
    DEFAULTS.maxDescontoUmProduto,
  );
  const [maxDescontoDoisOuMais, setMaxDescontoDoisOuMais] = useState(
    DEFAULTS.maxDescontoDoisOuMais,
  );
  const [aniversario, setAniversario] = useState(DEFAULTS.aniversario);
  const [cupons, setCupons] = useState<Cupom[]>(DEFAULTS.cupons);
  const [novoCupomAberto, setNovoCupomAberto] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoDesconto, setNovoDesconto] = useState('');
  const [novaValidade, setNovaValidade] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'blocked'>(
    'loading',
  );
  const [tenantCtx, setTenantCtx] = useState<{
    tenantId: string;
    storeId: string;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const canSave = loadState === 'ready' && Boolean(tenantCtx);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ctx = await resolveTenantContext();
      if (cancelled) return;

      const setters = {
        setSobreNegocio,
        setPersonalidade,
        setInstrucoesExtras,
        setHoraInicio,
        setHoraFim,
        setDiasAtivos,
        setFollowUpDias,
        setDescontoPadrao,
        setMargemMaxima,
        setMaxDescontoUmProduto,
        setMaxDescontoDoisOuMais,
        setAniversario,
        setCupons,
      };

      if (ctx.tenantId && ctx.storeId) {
        setTenantCtx({ tenantId: ctx.tenantId, storeId: ctx.storeId });
        try {
          const { rules } = await getStoreRules(ctx.tenantId, ctx.storeId);
          if (cancelled) return;
          if (rules) applyRules(rules, setters);
          setLoadState('ready');
          return;
        } catch (err) {
          if (!cancelled) {
            setErro(
              err instanceof Error
                ? err.message
                : 'Não foi possível carregar as regras da conta. Recarregue antes de salvar.',
            );
            setLoadState('blocked');
          }
          return;
        }
      }

      setErro('Entre na conta da loja para carregar e salvar as regras na conta.');
      setLoadState('blocked');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleDia(dia: string) {
    setDiasAtivos((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  }

  function handleAdicionarCupom(e: FormEvent) {
    e.preventDefault();
    if (!novoCodigo.trim() || !novoDesconto.trim()) return;
    const pct = parseDescontoPct(novoDesconto);
    if (pct === null) {
      setErro('Informe o desconto do cupom em porcentagem (0 a 100).');
      return;
    }
    const teto = parseDescontoPct(margemMaxima) ?? 100;
    if (pct > teto) {
      setErro(`O cupom não pode passar do desconto máximo da loja (${teto}%).`);
      return;
    }
    setErro(null);
    setCupons((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        codigo: novoCodigo.trim().toUpperCase(),
        desconto: formatDescontoPct(pct),
        validade: novaValidade.trim() || 'Sem validade',
      },
    ]);
    setNovoCodigo('');
    setNovoDesconto('');
    setNovaValidade('');
    setNovoCupomAberto(false);
  }

  async function handleSalvar() {
    if (!canSave || !tenantCtx) {
      setErro('Entre na conta da loja para salvar as regras na conta.');
      return;
    }

    const payload: StoreRules = {
      sobreNegocio,
      personalidade,
      instrucoesExtras,
      horaInicio,
      horaFim,
      diasAtivos,
      followUpDias,
      descontoPadrao,
      margemMaxima,
      maxDescontoUmProduto,
      maxDescontoDoisOuMais,
      aniversario,
      cupons,
    };

    setSaving(true);
    setErro(null);
    try {
      await saveStoreRules(tenantCtx.tenantId, tenantCtx.storeId, payload);
      setLoadState('ready');
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar regras.');
    } finally {
      setSaving(false);
    }
  }

  const textareaClass =
    'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
  const fieldClass =
    'rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Regras"
        subtitle="Configure entrega, avisos de pedido e como a Voltou conversa com seus clientes."
      />

      {loadState !== 'ready' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadState === 'loading'
            ? 'Carregando as regras da conta…'
            : 'As regras só gravam na conta depois que o carregamento da API funcionar. Nada é salvo só no navegador.'}
        </div>
      )}

      <FulfillmentSettingsCard />

      <Section
        title="Sobre o negócio"
        description="Ajuda a Voltou a vender no tom da sua loja ao responder clientes."
      >
        <textarea
          value={sobreNegocio}
          onChange={(e) => setSobreNegocio(e.target.value)}
          rows={4}
          className={textareaClass}
        />
      </Section>

      <Section
        title="Personalidade do vendedor"
        description="Como o tom de voz das mensagens deve se comportar."
      >
        <textarea
          value={personalidade}
          onChange={(e) => setPersonalidade(e.target.value)}
          rows={3}
          className={textareaClass}
        />
      </Section>

      <Section
        title="Instruções extras"
        description="Regras de atendimento e oferta que devem sempre ser seguidas ou evitadas."
      >
        <textarea
          value={instrucoesExtras}
          onChange={(e) => setInstrucoesExtras(e.target.value)}
          rows={3}
          className={textareaClass}
        />
      </Section>

      <Section
        title="Horário de atendimento"
        description="Mensagens da Voltou só saem dentro dessa janela, nos dias selecionados."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Início
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Fim
            <input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {DIAS_SEMANA.map((dia) => {
            const ativo = diasAtivos.includes(dia);
            return (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                className={`h-10 w-14 rounded-xl text-sm font-medium transition ${
                  ativo
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {dia}
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Ofertas de recuperação"
        description="Regras de follow-up e descontos nas ofertas de recuperação."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Follow-up após a compra
            <select
              value={followUpDias}
              onChange={(e) => setFollowUpDias(e.target.value)}
              className={fieldClass}
            >
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Desconto padrão oferecido
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={descontoPadrao}
                onChange={(e) => setDescontoPadrao(e.target.value)}
                className={`${fieldClass} w-full pr-8`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Margem máxima de desconto
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={margemMaxima}
                onChange={(e) => setMargemMaxima(e.target.value)}
                className={`${fieldClass} w-full pr-8`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Máx. desconto — 1 produto (%)
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={maxDescontoUmProduto}
                onChange={(e) => setMaxDescontoUmProduto(e.target.value)}
                className={`${fieldClass} w-full pr-8`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Máx. desconto — 2 ou mais produtos (%)
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={maxDescontoDoisOuMais}
                onChange={(e) => setMaxDescontoDoisOuMais(e.target.value)}
                className={`${fieldClass} w-full pr-8`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </label>

          <p className="text-xs text-muted-foreground sm:col-span-2">
            A Voltou não oferece cupom acima desses tetos. Com 2+ itens no checkout, o
            teto de 2+ vale para cada item.
          </p>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Mensagem de aniversário</p>
              <p className="text-xs text-muted-foreground">
                Envia cupom especial no aniversário do cliente.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aniversario}
              onClick={() => setAniversario((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                aniversario ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition ${
                  aniversario ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </Section>

      <Section
        title="Cupons"
        description="Códigos com desconto máximo em porcentagem. A Voltou não passa do teto da loja."
      >
        <div className="divide-y divide-border rounded-xl border border-border">
          {cupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{c.codigo}</p>
                <p className="text-xs text-muted-foreground">Válido até {c.validade}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary">
                  {c.desconto}
                </span>
                <button
                  type="button"
                  title="Remover cupom"
                  onClick={() => setCupons((prev) => prev.filter((item) => item.id !== c.id))}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {cupons.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum cupom cadastrado ainda.
            </p>
          )}
        </div>

        {novoCupomAberto ? (
          <form
            onSubmit={handleAdicionarCupom}
            className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-3"
          >
            <input
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value)}
              placeholder="Código (ex: VOLTA10)"
              className={fieldClass}
              required
            />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={novoDesconto}
                onChange={(e) => setNovoDesconto(e.target.value)}
                placeholder="Desconto máximo %"
                className={`${fieldClass} w-full pr-8`}
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <input
              value={novaValidade}
              onChange={(e) => setNovaValidade(e.target.value)}
              placeholder="Validade (opcional)"
              className={fieldClass}
            />
            <div className="flex gap-2 sm:col-span-3">
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                Adicionar cupom
              </button>
              <button
                type="button"
                onClick={() => setNovoCupomAberto(false)}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNovoCupomAberto(true)}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Novo cupom
          </button>
        )}
      </Section>

      <div className="sticky bottom-4 z-10 flex flex-col items-end gap-2">
        {erro && (
          <span className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm text-red-700">
            {erro}
          </span>
        )}
        <div className="flex items-center gap-3">
          {salvo && (
            <span className="rounded-xl border border-success/30 bg-success/10 px-3.5 py-2 text-sm font-medium text-success shadow-[var(--shadow-soft)]">
              Salvo na conta da loja.
            </span>
          )}
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={() => void handleSalvar()}
            className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar regras'}
          </button>
        </div>
      </div>
    </div>
  );
}
