'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeMercadoPagoOAuth } from '@/lib/api';

function MpCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Conectando ao Mercado Pago…');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      router.replace(
        `/painel/perfil?mp=error&msg=${encodeURIComponent(error)}`,
      );
      return;
    }

    if (!code || !state) {
      router.replace(
        `/painel/perfil?mp=error&msg=${encodeURIComponent('Código OAuth ausente.')}`,
      );
      return;
    }

    void completeMercadoPagoOAuth(code, state)
      .then(() => {
        router.replace('/painel/perfil?mp=connected');
      })
      .catch((err) => {
        const msg = encodeURIComponent(
          err instanceof Error ? err.message : 'Falha no callback OAuth.',
        );
        setMessage('Não foi possível concluir a conexão.');
        router.replace(`/painel/perfil?mp=error&msg=${msg}`);
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function MercadoPagoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Conectando ao Mercado Pago…
          </p>
        </div>
      }
    >
      <MpCallbackInner />
    </Suspense>
  );
}
