'use client';

import Link from 'next/link';
import {
  ONBOARDING_HOME_EYEBROW,
  ONBOARDING_HOME_SUBTITLE,
  ONBOARDING_HOME_TITLE,
  type OnboardingSnapshot,
} from '@/lib/lojista-onboarding';

type Props = {
  snapshot: OnboardingSnapshot;
  variant?: 'home' | 'compact';
  ownerFirstName?: string;
};

export function OnboardingWizard({
  snapshot,
  variant = 'home',
  ownerFirstName,
}: Props) {
  if (snapshot.allDone) return null;

  const remaining = snapshot.steps.length - snapshot.completedCount;
  const nextStep = snapshot.next;

  if (variant === 'compact') {
    return (
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[var(--shadow-soft)]">
        <div className="px-3.5 py-3 sm:px-5 sm:py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {snapshot.completedCount} de {snapshot.steps.length} prontos
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {remaining === 1
              ? 'Último passo para a loja ficar pronta'
              : `Faltam ${remaining} passos para a loja ficar pronta`}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A 2ª venda a Voltou faz por você.
          </p>
          {nextStep && (
            <Link
              href={nextStep.href}
              className="mt-3 flex items-center gap-3 rounded-xl bg-primary px-3.5 py-3 text-primary-foreground transition hover:opacity-95"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">
                  {nextStep.cta}
                </span>
                <span className="mt-0.5 block text-xs text-primary-foreground/80">
                  {nextStep.sentence}
                </span>
              </span>
              <span className="shrink-0 text-lg leading-none" aria-hidden>
                →
              </span>
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[var(--shadow-soft)] ring-1 ring-primary/10">
      <div className="border-b border-border/70 px-3.5 py-4 sm:px-5 sm:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          {ONBOARDING_HOME_EYEBROW}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {ownerFirstName
            ? `${ownerFirstName}, ${ONBOARDING_HOME_TITLE.toLowerCase()}`
            : ONBOARDING_HOME_TITLE}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ONBOARDING_HOME_SUBTITLE}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {snapshot.completedCount} de {snapshot.steps.length} concluídos
        </p>
      </div>

      <ol className="space-y-1 px-2 py-3 sm:px-3 sm:py-4">
        {snapshot.steps.map((step, idx) => {
          const isNext = nextStep?.id === step.id;
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  isNext
                    ? 'bg-primary text-primary-foreground'
                    : step.done
                      ? 'text-muted-foreground'
                      : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    step.done
                      ? 'bg-success/15 text-success'
                      : isNext
                        ? 'bg-primary-foreground/15 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.done ? '✓' : idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block font-semibold leading-tight ${
                      step.done ? 'line-through decoration-border' : ''
                    }`}
                  >
                    {isNext ? step.cta : step.title}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      isNext ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {step.sentence}
                  </span>
                </span>
                {!step.done && (
                  <span className="shrink-0 text-lg leading-none" aria-hidden>
                    →
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
