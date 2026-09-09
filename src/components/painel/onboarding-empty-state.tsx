'use client';

import Link from 'next/link';
import {
  onboardingEmptyState,
  onboardingEmptyStateFor,
  type OnboardingSnapshot,
  type OnboardingStepId,
} from '@/lib/lojista-onboarding';

const ctaClass =
  'mt-4 inline-flex h-[54px] min-h-11 w-full items-center justify-center rounded-xl bg-[#0e9254] px-4 text-base font-semibold text-[#f6fbf6] transition hover:opacity-95';

type Props = {
  snapshot: OnboardingSnapshot | null;
  stepId?: OnboardingStepId;
  fallbackSentence?: string;
  fallbackCta?: string;
  onFallbackCta?: () => void;
  /** When the next step belongs to this page, open the local modal instead of navigating. */
  onCtaClick?: () => void;
  hideCta?: boolean;
};

export function OnboardingEmptyState({
  snapshot,
  stepId,
  fallbackSentence,
  fallbackCta,
  onFallbackCta,
  onCtaClick,
  hideCta = false,
}: Props) {
  const fromStep = stepId ? onboardingEmptyStateFor(stepId) : null;
  const fromNext = snapshot ? onboardingEmptyState(snapshot) : null;
  const empty = fromStep ?? fromNext;
  const sentence = empty?.sentence ?? fallbackSentence ?? '';
  const cta = empty?.cta ?? fallbackCta;
  const href = empty?.href;
  const handleClick = empty ? onCtaClick : onFallbackCta;
  const isNext = Boolean(
    snapshot && stepId && snapshot.next?.id === stepId,
  ) || Boolean(snapshot && !stepId && snapshot.next);

  return (
    <div className="rounded-2xl border border-[#0e9254]/20 bg-[#f6fbf6] px-4 py-6 text-[#111e15]">
      {isNext && snapshot ? (
        <p className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-[#0e9254]">
          <span>Próximo passo</span>
          <span>
            {snapshot.completedCount} de {snapshot.steps.length}
          </span>
        </p>
      ) : null}
      <p className="text-sm">{sentence}</p>
      {hideCta || !cta ? null : handleClick ? (
        <button type="button" onClick={handleClick} className={ctaClass}>
          {cta}
        </button>
      ) : href ? (
        <Link href={href} className={ctaClass}>
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
