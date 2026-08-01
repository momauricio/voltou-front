'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { WhatsappProductMock } from '@/components/landing/mocks/whatsapp-product-mock';

export function LandingWhatsappMock() {
  return (
    <LandingFeatureRow
      id="prova"
      title="Vendemos de novo pra aquele cliente que comprou só uma vez"
      body="A IA escolhe o produto, personaliza o cupom e fecha no timing certo."
      visual={<WhatsappProductMock />}
    />
  );
}
