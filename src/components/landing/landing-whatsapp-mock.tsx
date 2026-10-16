'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { WhatsappProductMock } from '@/components/landing/mocks/whatsapp-product-mock';

export function LandingWhatsappMock() {
  return (
    <LandingFeatureRow
      id="prova"
      title="A Voltou chama. Você não dispara."
      body="No balcão, nome e contato. O time e a IA da Voltou fazem o contato, com cupom personalizado para o cliente. O cliente paga no link e você recebe o aviso pra entregar."
      visual={<WhatsappProductMock />}
    />
  );
}
