'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { WhatsappProductMock } from '@/components/landing/mocks/whatsapp-product-mock';

export function LandingWhatsappMock() {
  return (
    <LandingFeatureRow
      id="prova"
      title="A conversa acontece no WhatsApp da sua loja"
      body="A Voltou sugere o produto e o cupom; a mensagem sai do número que o cliente já conhece. O cliente paga no link e você recebe o aviso pra entregar."
      visual={<WhatsappProductMock />}
    />
  );
}
