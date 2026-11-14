'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { WhatsappProductMock } from '@/components/landing/mocks/whatsapp-product-mock';
import { LANDING_PROOF } from '@/lib/landing-copy';

export function LandingWhatsappMock() {
  return (
    <LandingFeatureRow
      id="prova"
      title={LANDING_PROOF.title}
      body={LANDING_PROOF.body}
      visual={<WhatsappProductMock />}
    />
  );
}
