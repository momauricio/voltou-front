'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getMercadoPagoConnection,
  getSegments,
  getStoreRules,
  listApiCustomers,
  listApiProducts,
  listCampaigns,
  listWhatsappConnections,
  resolveTenantContext,
} from '@/lib/api';

const STORAGE_DISMISS = 'voltou_onboarding_dismissed';

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  optional?: boolean;
};

/**
 * RCD: Progress effect + Zeigarnik + one clear next action.
 * Compact checklist — not a wall of cards. Outcome first.
 */
export function OnboardingWizard() {
  const pathname = usePathname();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_DISMISS) === '1');
  }, []);

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    void (async () => {
      const ctx = await resolveTenantContext();
      if (cancelled || !ctx.tenantId || !ctx.storeId) {
        if (!cancelled) setSteps(null);
        return;
      }

      const [customers, products, rules, wa, mp, segments, campaigns] =
        await Promise.all([
          listApiCustomers(ctx.tenantId, ctx.storeId).catch(() => []),
          listApiProducts(ctx.tenantId, ctx.storeId).catch(() => []),
          getStoreRules(ctx.tenantId, ctx.storeId).catch(() => ({
            rules: null,
          })),
          listWhatsappConnections(ctx.tenantId, ctx.storeId).catch(() => []),
          getMercadoPagoConnection(ctx.tenantId, ctx.storeId).catch(() => ({
            connected: false,
          })),
          getSegments(ctx.tenantId, ctx.storeId).catch(() => null),
          listCampaigns(ctx.tenantId, ctx.storeId).catch(() => []),
        ]);

      if (cancelled) return;

      const waConnected = wa.some(
        (c) => c.uiStatus === 'Conectado' || c.status === 'WORKING',
      );
      const hasSentCampaign = campaigns.some((c) => c.counts.sent > 0);

      // Path crítico: MP → base → WA → 1º disparo (regras opcionais)
      setSteps([
        {
          id: 'pagamento',
          title: 'Conectar o Mercado Pago',
          description: mp.connected
            ? 'Checkout pronto para receber'
            : 'Sem isso o cliente não consegue pagar o cupom',
          href: '/painel/loja/pagamentos',
          done: Boolean(mp.connected),
        },
        {
          id: 'dados',
          title: 'Trazer quem já compra de você',
          description:
            customers.length && products.length
              ? 'Base pronta para reativar'
              : customers.length
                ? 'Clientes ok — falta o catálogo'
                : products.length
                  ? 'Produtos ok — falta a lista de clientes'
                  : 'Importe a planilha do PDV (clientes + produtos)',
          href: '/painel/clientes?import=1',
          done: customers.length > 0 && products.length > 0,
        },
        {
          id: 'whatsapp',
          title: 'Abrir o canal de retorno',
          description: 'Conecte o WhatsApp da loja',
          href: '/painel/whatsapp',
          done: waConnected,
        },
        {
          id: 'campanha',
          title: 'Disparar a 1ª recuperação',
          description: hasSentCampaign
            ? 'Primeiro lote enviado'
            : segments && segments.readyToContact > 0
              ? `${segments.readyToContact} clientes prontos — envie agora`
              : 'Aprovar o primeiro lote e enviar',
          href: '/painel/campanhas',
          done: hasSentCampaign,
        },
        {
          id: 'regras',
          title: 'Afinar horário e desconto',
          description: 'Tom, janela e teto de desconto',
          href: '/painel/regras',
          done: Boolean(rules.rules),
          optional: true,
        },
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [dismissed, pathname]);

  const required = useMemo(
    () => (steps ?? []).filter((s) => !s.optional),
    [steps],
  );
  const doneRequired = required.filter((s) => s.done).length;
  const nextStep = required.find((s) => !s.done) ?? null;
  const optional = (steps ?? []).filter((s) => s.optional);

  // Progress effect: account already created → never start at 0%
  const progressPct = required.length
    ? Math.round(((doneRequired + 1) / (required.length + 1)) * 100)
    : 0;

  if (dismissed || !steps) return null;
  if (doneRequired >= required.length) return null;

  const onHome = pathname === '/painel';
  const remaining = required.length - doneRequired;

  function dismiss() {
    window.localStorage.setItem(STORAGE_DISMISS, '1');
    setDismissed(true);
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[var(--shadow-soft)] ${
        onHome ? 'ring-1 ring-primary/10' : ''
      }`}
    >
      {/* Compact header + progress */}
      <div className="border-b border-border/70 px-3.5 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Até a 1ª venda recuperada
            </p>
            <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {remaining === 1
                ? 'Último passo — dispare a recuperação'
                : `Faltam ${remaining} passos para voltar a vender`}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {doneRequired} de {required.length} essenciais · {progressPct}%
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Depois
          </button>
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da configuração"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* One next action — active onboarding */}
      {nextStep && (
        <div className="px-3.5 py-3 sm:px-5 sm:py-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Próximo passo
          </p>
          <Link
            href={nextStep.href}
            className="flex items-center gap-3 rounded-xl bg-primary px-3.5 py-3 text-primary-foreground transition hover:opacity-95 active:scale-[0.99] sm:px-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-bold">
              {doneRequired + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">
                {nextStep.title}
              </span>
              <span className="mt-0.5 block text-xs text-primary-foreground/80">
                {nextStep.description}
              </span>
            </span>
            <span className="shrink-0 text-lg leading-none" aria-hidden>
              →
            </span>
          </Link>
        </div>
      )}

      {/* Dense checklist — full on home / desktop; collapsed elsewhere */}
      {(onHome || expanded) && (
        <div className="border-t border-border/70 px-2 py-2 sm:px-3">
          {!onHome && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted/60 sm:hidden"
            >
              Ocultar lista
              <span aria-hidden>▴</span>
            </button>
          )}
          {onHome && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground sm:hidden"
            >
              {expanded ? 'Ocultar lista' : 'Ver todos os passos'}
              <span aria-hidden>{expanded ? '▴' : '▾'}</span>
            </button>
          )}

          <ol
            className={`mt-0.5 space-y-0.5 ${
              onHome ? (expanded ? 'block' : 'hidden sm:block') : 'block'
            }`}
          >
            {required.map((step, idx) => {
              const isNext = nextStep?.id === step.id;
              return (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                      isNext
                        ? 'bg-accent/80 text-foreground'
                        : step.done
                          ? 'text-muted-foreground'
                          : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        step.done
                          ? 'bg-success/15 text-success'
                          : isNext
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.done ? '✓' : idx + 1}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate ${
                        step.done
                          ? 'line-through decoration-border'
                          : 'font-medium'
                      }`}
                    >
                      {step.title}
                    </span>
                    {!step.done && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        ir
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            {optional.map((step) => (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.done
                        ? 'bg-success/15 text-success'
                        : 'border border-dashed border-border'
                    }`}
                  >
                    {step.done ? '✓' : '·'}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {step.title}
                    <span className="ml-1 text-[10px] font-normal uppercase tracking-wide opacity-70">
                      opcional
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!onHome && !expanded && (
        <div className="border-t border-border/70 px-3 py-2 sm:hidden">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full text-center text-xs font-medium text-muted-foreground"
          >
            Ver todos os passos ▾
          </button>
        </div>
      )}
    </section>
  );
}
