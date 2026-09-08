'use client';

import Link from 'next/link';
import {
  onboardingEmptyState,
  type OnboardingSnapshot,
} from '@/lib/lojista-onboarding';

const ctaClass =
  'mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95';

type Props = {
  snapshot: OnboardingSnapshot | null;
  fallbackSentence: string;
  fallbackCta?: string;
  onFallbackCta?: () => void;
  /** When the next step belongs to this page, open the local modal instead of navigating. */
  onCtaClick?: () => void;
};

export function OnboardingEmptyState({
  snapshot,
  fallbackSentence,
  fallbackCta,
  onFallbackCta,
  onCtaClick,
}: Props) {
  const empty = snapshot ? onboardingEmptyState(snapshot) : null;
  const sentence = empty?.sentence ?? fallbackSentence;
  const cta = empty?.cta ?? fallbackCta;
  const href = empty?.href;
  const handleClick = empty ? onCtaClick : onFallbackCta;

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center shadow-[var(--shadow-soft)]">
      <p className="text-sm text-muted-foreground">{sentence}</p>
      {cta && handleClick ? (
        <button type="button" onClick={handleClick} className={ctaClass}>
          {cta}
        </button>
      ) : cta && href ? (
        <Link href={href} className={ctaClass}>
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
