'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { resetPassword } from '@/lib/api';

function RedefinirSenhaForm() {
  const params = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token || token.length < 16) {
      setError('Link inválido. Solicite um novo email de redefinição.');
      return;
    }
    if (password.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível redefinir.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Redefinir senha</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Escolha uma senha nova para acessar o painel.
      </p>

      {!token ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-red-700">
            Link incompleto. Peça um novo email em Esqueci a senha.
          </p>
          <Link
            href="/esqueci-senha"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : done ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl border border-border bg-accent/50 px-3 py-3 text-sm text-foreground">
            Senha redefinida. Você já pode entrar.
          </p>
          <Link
            href="/entrar"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Ir para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Nova senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="text-sm font-medium">
              Confirmar senha
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
              minLength={8}
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
            {loading ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function RedefinirSenhaPage() {
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
          <RedefinirSenhaForm />
        </Suspense>
      </div>
    </div>
  );
}
