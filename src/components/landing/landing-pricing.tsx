'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { PricingChipsMock } from '@/components/landing/mocks/pricing-chips-mock';
import { LANDING_PRICING } from '@/lib/landing-copy';

export function LandingPricing() {
  return (
    <LandingFeatureRow
      id="preco"
      title={LANDING_PRICING.title}
      body={
        <>
          <span className="block">{LANDING_PRICING.paragraphs[0]}</span>
          <span className="mt-4 block text-sm sm:text-base">
            {LANDING_PRICING.paragraphs[1]}
          </span>
        </>
      }
      visual={<PricingChipsMock />}
      reverse
      mutedBg
    />
  );
}
