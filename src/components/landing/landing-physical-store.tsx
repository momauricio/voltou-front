'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { BalcaoBeforeAfterMock } from '@/components/landing/mocks/balcao-before-after-mock';

export function LandingPhysicalStore() {
  return (
    <LandingFeatureRow
      id="loja-fisica"
      title="Feito pra loja física — não pra e-commerce de carrinho abandonado"
      body="Cadastro no balcão em 30s; a Voltou chase quem já comprou ou quis comprar."
      visual={<BalcaoBeforeAfterMock />}
      reverse
      mutedBg
    />
  );
}
