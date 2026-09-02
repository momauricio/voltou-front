'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAccount, persistStaffSession } from '@/lib/api';
import {
  safeEquipeNext,
  staffLoginOutcome,
} from '@/lib/staff-crm';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.1 3.1" />
      <path d="M6.6 6.6C3.9 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.4-1" />
      <path d="M14 14.1A3 3 0 0 1 9.9 10" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function StaffLoginForm({
  notice,
  nextPath,
}: {
  notice?: string | null;
  nextPath?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(notice ?? null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError('Informe um email válido.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginAccount({
        email: email.trim().toLowerCase(),
        password,
      });
      const outcome = staffLoginOutcome(result.user.role);
      if (outcome.action === 'reject') {
        setError(outcome.message);
        return;
      }
      await persistStaffSession(result);
      router.push(safeEquipeNext(nextPath) ?? outcome.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20';
  const labelClass = 'text-sm font-medium text-foreground';

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Equipe Voltou
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entre com a conta da equipe para ver as lojas e os clientes.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="equipe@voltouapp.com"
            className={fieldClass}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Senha
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} mt-0 pr-11`}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Aguarde…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
