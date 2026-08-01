'use client';

import { PageHeader } from '@/components/painel/page-header';
import { FulfillmentSettingsCard } from '@/components/painel/fulfillment-settings-card';

export default function LojaEntregasPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Entregas e Pedidos"
        subtitle="Configure frete, retirada e avisos de pedido pelo WhatsApp."
      />
      <FulfillmentSettingsCard />
    </div>
  );
}
