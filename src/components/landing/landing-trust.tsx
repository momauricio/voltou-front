'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { TrustCompareMock } from '@/components/landing/mocks/trust-compare-mock';

export function LandingTrust() {
  return (
    <LandingFeatureRow
      id="confianca"
      title="O cliente não desconfia — é o WhatsApp da loja"
      body="Sem número estranho. Sem “oi sumida” de desconhecido."
      visual={<TrustCompareMock />}
    />
  );
}
