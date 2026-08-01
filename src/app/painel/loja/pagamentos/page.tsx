'use client';

import { Suspense } from 'react';
import { PageHeader } from '@/components/painel/page-header';
import { PaymentProvidersCard } from '@/components/painel/payment-providers-card';

export default function LojaPagamentosPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Pagamentos e Comissões"
        subtitle="Conecte provedores de pagamento e acompanhe a comissão da Voltou."
      />
      <Suspense fallback={null}>
        <PaymentProvidersCard />
      </Suspense>
    </div>
  );
}
