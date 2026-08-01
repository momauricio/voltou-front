'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { PricingChipsMock } from '@/components/landing/mocks/pricing-chips-mock';

export function LandingPricing() {
  return (
    <LandingFeatureRow
      id="preco"
      title="Sem mensalidade. Sem cartão. Só comissão na venda recuperada."
      body="Você paga quando a Voltou recupera uma venda que não aconteceria sozinha."
      visual={<PricingChipsMock />}
      reverse
      mutedBg
    />
  );
}
