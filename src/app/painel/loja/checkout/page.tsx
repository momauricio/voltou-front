'use client';

import { PageHeader } from '@/components/painel/page-header';
import { CheckoutBrandingCard } from '@/components/painel/checkout-branding-card';

export default function LojaCheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Checkout"
        subtitle="Personalize a aparência e a identidade visual do checkout da loja."
      />
      <CheckoutBrandingCard />
    </div>
  );
}
