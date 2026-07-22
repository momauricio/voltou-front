'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeBlingOAuth } from '@/lib/api';

function BlingCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Conectando ao Bling…');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const msg = encodeURIComponent(error);
      router.replace(`/painel/produtos?bling=error&msg=${msg}`);
      return;
    }

    if (!code || !state) {
      router.replace(
        `/painel/produtos?bling=error&msg=${encodeURIComponent('Código OAuth ausente.')}`,
      );
      return;
    }

    void completeBlingOAuth(code, state)
      .then(() => {
        router.replace('/painel/produtos?bling=connected');
      })
      .catch((err) => {
        const msg = encodeURIComponent(
          err instanceof Error ? err.message : 'Falha no callback OAuth.',
        );
        setMessage('Não foi possível concluir a conexão.');
        router.replace(`/painel/produtos?bling=error&msg=${msg}`);
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function BlingCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Conectando ao Bling…</p>
        </div>
      }
    >
      <BlingCallbackInner />
    </Suspense>
  );
}
