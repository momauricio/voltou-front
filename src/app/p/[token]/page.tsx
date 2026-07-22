'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { CheckoutPreview } from '@/components/checkout/checkout-preview';
import { getPublicCheckout, type PublicCheckout } from '@/lib/api';
import { safeExternalRedirect } from '@/lib/safe-redirect';

export default function CheckoutPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [checkout, setCheckout] = useState<PublicCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getPublicCheckout(token)
      .then((data) => {
        if (cancelled) return;
        if (data.couponCode && data.storeSlug) {
          router.replace(`/loja/${data.storeSlug}/${data.couponCode}`);
          return;
        }
        setCheckout(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Link inválido ou expirado',
          );
          setCheckout(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Carregando pagamento…</p>
      </div>
    );
  }

  if (error || !checkout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <BrandLogo className="mb-8 h-8" />
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-lg font-semibold text-foreground">
            Link inválido ou expirado
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ??
              'Este link de pagamento não existe ou já não está mais disponível.'}
          </p>
        </div>
      </div>
    );
  }

  const status =
    checkout.status === 'paid' || checkout.status === 'expired'
      ? checkout.status
      : 'pending';

  return (
    <div className="min-h-screen">
      <CheckoutPreview
        storeName={checkout.storeName}
        productName={checkout.productName}
        amountCents={checkout.amountCents}
        customerName={checkout.customerName}
        branding={checkout.branding}
        status={status}
        initPoint={checkout.initPoint}
        provider={checkout.provider}
        paying={paying}
        onPay={() => {
          if (!checkout.initPoint) return;
          setPaying(true);
          try {
            safeExternalRedirect(checkout.initPoint);
          } catch (err) {
            setPaying(false);
            setError(
              err instanceof Error
                ? err.message
                : 'Link de pagamento inválido.',
            );
          }
        }}
      />
    </div>
  );
}
