'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StoreBrandMark } from '@/components/checkout/store-brand-mark';
import { getPublicOfferStatus, type PublicOfferStatus } from '@/lib/api';

export default function AguardandoPage({
  params,
}: {
  params: Promise<{ slug: string; cupom: string }>;
}) {
  const { slug, cupom } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<PublicOfferStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await getPublicOfferStatus(slug, cupom);
        if (cancelled) return;
        setStatus(data);
        if (data.status === 'paid') {
          router.replace(`/obrigado/${slug}/${cupom}`);
          return;
        }
        if (data.status === 'expired' || data.status === 'cancelled') {
          router.replace(`/loja/${slug}/${cupom}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Falha ao consultar status',
          );
        }
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [slug, cupom, router]);

  const primary = status?.branding?.primaryColor?.trim() || '#0F766E';
  const secondary = status?.branding?.secondaryColor?.trim() || '#FEF3C7';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={{
        background: `linear-gradient(160deg, ${secondary} 0%, #ffffff 55%)`,
      }}
    >
      <StoreBrandMark
        storeName={status?.storeName ?? 'Loja'}
        logoUrl={status?.branding?.logoUrl}
        primaryColor={primary}
        className="mb-8"
      />
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
        <div
          className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full"
          style={{ background: `${primary}33` }}
        />
        <h1 className="text-xl font-semibold text-foreground">
          Pagamento em processamento
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Estamos confirmando com o Mercado Pago. Esta página atualiza
          automaticamente a cada 5 segundos.
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
