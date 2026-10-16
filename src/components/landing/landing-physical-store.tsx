'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { LojistaDayMock } from '@/components/landing/mocks/lojista-day-mock';

export function LandingPhysicalStore() {
  return (
    <LandingFeatureRow
      id="loja-fisica"
      title="Você já tem nome, contato e o interesse do cliente — e a venda some na mesma."
      body={
        <>
          <span className="block">
            O dia do lojista não para: pagar conta, comprar produto, cuidar da equipe,
            controlar estoque. Sobrar tempo pra chamar o cliente de volta depois que a
            pessoa saiu da loja? Quase nunca. E a equipe da loja também não foi treinada
            pra isso.
          </span>
          <span className="mt-4 block">
            Na mão: nome · contato · o que a pessoa quis. Mesmo assim, ninguém oferece de
            novo com cuidado.
          </span>
          <span className="mt-4 block font-medium text-foreground">
            É isso que a Voltou resolve.
          </span>
        </>
      }
      visual={<LojistaDayMock />}
      mutedBg
    />
  );
}
