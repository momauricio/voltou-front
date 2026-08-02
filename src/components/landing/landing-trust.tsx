'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { TrustCompareMock } from '@/components/landing/mocks/trust-compare-mock';

export function LandingTrust() {
  return (
    <LandingFeatureRow
      id="confianca"
      title="O cliente vê o número da loja, não um desconhecido"
      body="A mensagem sai do WhatsApp que ele já salvou quando comprou. Sem número novo, sem parecer golpe."
      visual={<TrustCompareMock />}
    />
  );
}
