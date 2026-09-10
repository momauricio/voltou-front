'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ONBOARDING_MOTHER_LINE_1,
  ONBOARDING_MOTHER_LINE_2,
  ONBOARDING_CHECKLIST_LABEL,
  LOJA_PRONTA_BANNER,
  progressLabel,
  type OnboardingSnapshot,
  type OnboardingStepView,
} from '@/lib/lojista-onboarding';
import { OnboardingEmptyState } from '@/components/painel/onboarding-empty-state';

const CTA_CLASS =
  'inline-flex h-[54px] min-h-11 w-full items-center justify-center rounded-xl bg-[#0e9254] px-4 text-base font-semibold text-[#f6fbf6] transition hover:opacity-95';

const LOJA_PRONTA_DISMISS_KEY = 'voltou_loja_pronta_v2_dismissed';

function StepRow({
  step,
  current,
}: {
  step: OnboardingStepView;
  current: boolean;
}) {
  const rowClass = `flex min-h-11 items-center gap-3 px-3 py-3 text-sm ${
    current ? 'font-bold text-[#111e15]' : step.done ? 'text-[#111e15]' : 'text-[#111e15]/70'
  }`;

  const mark = (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center text-base ${
        step.done ? 'text-[#0e9254]' : current ? 'text-[#0e9254]' : 'text-[#111e15]/50'
      }`}
      aria-hidden
    >
      {step.done ? '✓' : '○'}
    </span>
  );

  const chevron = (step.done || current) && (
    <span className="shrink-0 text-lg leading-none text-[#111e15]/50" aria-hidden>
      ›
    </span>
  );

  const body = (
    <>
      {mark}
      <span className="min-w-0 flex-1">{step.title}</span>
      {chevron}
    </>
  );

  if (step.done) {
    return (
      <Link
        href={step.href}
        className={`${rowClass} rounded-xl border border-[#111e15]`}
      >
        {body}
      </Link>
    );
  }

  if (current) {
    return (
      <div className="rounded-xl border border-[#0e9254] bg-[#f6fbf6]">
        <Link href={step.href} className={rowClass}>
          {body}
        </Link>
      </div>
    );
  }

  return <div className={`${rowClass} rounded-xl`}>{body}</div>;
}

export function OnboardingWizard({ snapshot }: { snapshot: OnboardingSnapshot }) {
  if (snapshot.allDone) return null;

  const nextStep = snapshot.next;

  return (
    <section className="mx-auto w-full max-w-[390px] pb-28 text-[#111e15] lg:max-w-lg">
      <h1 className="text-[1.35rem] font-semibold leading-snug tracking-tight">
        <span className="block">{ONBOARDING_MOTHER_LINE_1}</span>
        <span className="block">{ONBOARDING_MOTHER_LINE_2}</span>
      </h1>

      <div className="sticky top-14 z-30 mt-5 bg-[#f6fbf6] py-3 lg:top-0">
        <p className="text-sm font-medium text-[#111e15]">
          <span className="text-3xl font-semibold leading-none text-[#0e9254]">
            {snapshot.completedCount}
          </span>{' '}
          {progressLabel(snapshot).replace(/^\d+\s/, '')}
        </p>
        <p className="mt-2 text-sm font-medium text-[#111e15]">
          {ONBOARDING_CHECKLIST_LABEL}
        </p>
      </div>

      <ol className="mt-2 space-y-2">
        {snapshot.steps.map((step) => (
          <li key={step.id}>
            <StepRow step={step} current={nextStep?.id === step.id} />
          </li>
        ))}
      </ol>

      {nextStep ? (
        <div className="mt-5">
          <OnboardingEmptyState
            snapshot={snapshot}
            stepId={nextStep.id}
            hideCta
          />
        </div>
      ) : null}

      {nextStep ? (
        <div
          className="fixed inset-x-4 z-40"
          style={{
            bottom: 'calc(var(--painel-pad-bottom, 0px) + 16px)',
          }}
        >
          <Link href={nextStep.href} className={CTA_CLASS}>
            {nextStep.cta}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function LojaProntaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(LOJA_PRONTA_DISMISS_KEY) !== '1');
  }, []);

  if (!visible) return null;

  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[#0e9254] bg-[#f6fbf6] px-3 py-2 text-sm font-semibold text-[#111e15]">
      <p>{LOJA_PRONTA_BANNER}</p>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(LOJA_PRONTA_DISMISS_KEY, '1');
          setVisible(false);
        }}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#111e15]"
        aria-label="Dispensar"
      >
        ×
      </button>
    </div>
  );
}
