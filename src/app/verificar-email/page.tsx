'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { verifyEmail } from '@/lib/api';

function VerificarEmailContent() {
  const params = useSearchParams();
  const email = params.get('email');
  const token = params.get('token');
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await verifyEmail(token);
        if (!cancelled) {
          setStatus('ok');
          setMessage(result.message);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(
            err instanceof Error ? err.message : 'Token inválido ou expirado.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">
        {token ? 'Confirmando email' : 'Confirme seu email'}
      </h1>

      {!token && (
        <p className="mt-3 text-sm text-muted-foreground">
          Enviamos um link de confirmação
          {email ? (
            <>
              {' '}
              para <strong className="text-foreground">{email}</strong>
            </>
          ) : null}
          . Abra o email e clique no link para ativar a conta da loja.
        </p>
      )}

      {token && status === 'idle' && (
        <p className="mt-3 text-sm text-muted-foreground">Validando…</p>
      )}
      {status === 'ok' && (
        <p className="mt-3 text-sm text-foreground">
          {message ?? 'Email confirmado. Você já pode entrar.'}
        </p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-700">{message}</p>
      )}

      <Link
        href="/entrar"
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
      >
        Ir para o login
      </Link>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto mb-10 max-w-md">
        <BrandLogo />
      </div>
      <div className="mx-auto flex max-w-md justify-center">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Carregando…</p>
          }
        >
          <VerificarEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
