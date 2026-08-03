'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { PricingChipsMock } from '@/components/landing/mocks/pricing-chips-mock';

export function LandingPricing() {
  return (
    <LandingFeatureRow
      id="preco"
      title="Sem mensalidade. Sem cartão. Você só paga se a venda entrar."
      body={
        <>
          <span className="block">
            A Voltou só ganha comissão quando recupera uma venda que não
            aconteceria sozinha. Se o cliente não pagar, você não paga a gente.
            Conta grátis pra começar — sem taxa fixa pra manter aberta.
          </span>
          <span className="mt-4 block text-sm sm:text-base">
            Não é custo de ferramenta. É divisão só no resultado.
          </span>
        </>
      }
      visual={<PricingChipsMock />}
      reverse
      mutedBg
    />
  );
}
