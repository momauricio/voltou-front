'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { requestPasswordReset } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError('Informe um email válido.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto mb-10 max-w-md">
        <BrandLogo />
      </div>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">Esqueci a senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Digite o email da sua conta. Se existir, enviaremos um link para
          redefinir a senha.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl border border-border bg-accent/50 px-3 py-3 text-sm text-foreground">
              Se o email <strong>{email}</strong> estiver cadastrado, o link já
              foi enviado. Confira a caixa de entrada e o spam.
            </p>
            <Link
              href="/entrar"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? 'Enviando…' : 'Enviar link'}
            </button>
            <Link
              href="/entrar"
              className="block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
