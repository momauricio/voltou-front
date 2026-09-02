'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleContinueButton } from '@/components/auth/google-continue-button';
import {
  BR_MOBILE_NATIONAL_PLACEHOLDER,
  formatBrMobileNational,
  nationalBrMobileToE164,
} from '@/lib/br-mobile-national';
import { formatCnpj, isValidCnpj, stripCnpj } from '@/lib/cnpj';
import {
  getCnpjStatus,
  googleAuth,
  isLoginResponse,
  loginAccount,
  persistClientSession,
  registerAccount,
} from '@/lib/api';
import {
  CNPJ_INACTIVE_MESSAGE,
  assertCnpjActiveForSignup,
  buildGoogleAuthPayload,
  buildLoginPayload,
  buildRegisterPayload,
  formatLojistaLoginIdentifierInput,
  parseLojistaLoginIdentifier,
} from '@/lib/lojista-signup';
import {
  lojistaLoginOutcome,
  STAFF_LOGIN_PATH,
} from '@/lib/staff-crm';

type Tab = 'entrar' | 'criar';

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

export function AuthForm({ initialTab = 'entrar' }: { initialTab?: Tab }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);

  const cnpjDigits = useMemo(() => stripCnpj(cnpj), [cnpj]);

  useEffect(() => {
    if (tab !== 'criar' || !isValidCnpj(cnpjDigits)) {
      setCnpjLookupError(null);
      return;
    }
    let cancelled = false;
    void assertCnpjActiveForSignup(cnpjDigits, getCnpjStatus).then((result) => {
      if (cancelled) return;
      setCnpjLookupError(result.ok ? null : result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, cnpjDigits]);

  async function finishLojistaLogin(result: {
    accessToken: string;
    user: { tenantId: string; storeId: string | null; role?: 'staff' | 'owner' };
  }) {
    const outcome = lojistaLoginOutcome(result.user.role);
    if (outcome.action === 'reject') {
      router.push(`${STAFF_LOGIN_PATH}?aviso=loja`);
      return;
    }
    await persistClientSession(result);
    router.push(outcome.href);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === 'criar') {
      const parsed = buildRegisterPayload({
        ownerName,
        storeName,
        cnpj,
        email,
        password,
        whatsapp,
      });
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }

      setLoading(true);
      try {
        const cnpjGate = await assertCnpjActiveForSignup(
          parsed.body.cnpj,
          getCnpjStatus,
        );
        if (!cnpjGate.ok) {
          setError(cnpjGate.error);
          setCnpjLookupError(cnpjGate.error);
          return;
        }
        const result = await registerAccount(parsed.body);
        router.push(
          `/verificar-email?email=${encodeURIComponent(result.email)}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const identifier = parseLojistaLoginIdentifier(loginId);
    if (identifier.kind === 'invalid') {
      setError(identifier.error);
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    const payload = buildLoginPayload({ identifier, password });
    if (!payload) {
      setError('Informe o email ou o WhatsApp.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginAccount(payload);
      await finishLojistaLogin(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleIdToken(idToken: string) {
    setError(null);

    if (tab === 'criar') {
      const phoneE164 = nationalBrMobileToE164(whatsapp);
      if (!phoneE164) {
        setError('Informe um celular no formato (11) 9 9999-9999.');
        return;
      }
      if (!ownerName.trim()) {
        setError('Informe o nome do dono.');
        return;
      }
      if (!storeName.trim()) {
        setError('Informe o nome da loja.');
        return;
      }
      if (!isValidCnpj(cnpjDigits)) {
        setError('CNPJ inválido. Confira os dígitos.');
        return;
      }

      setLoading(true);
      try {
        const cnpjGate = await assertCnpjActiveForSignup(
          cnpjDigits,
          getCnpjStatus,
        );
        if (!cnpjGate.ok) {
          setError(cnpjGate.error);
          setCnpjLookupError(cnpjGate.error);
          return;
        }
        const result = await googleAuth(
          buildGoogleAuthPayload({
            idToken,
            mode: 'criar',
            ownerName,
            storeName,
            cnpj: cnpjDigits,
            phoneE164,
          }),
        );
        if (isLoginResponse(result)) {
          await finishLojistaLogin(result);
          return;
        }
        router.push(
          `/verificar-email?email=${encodeURIComponent(result.email)}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const result = await googleAuth(
        buildGoogleAuthPayload({ idToken, mode: 'entrar' }),
      );
      if (!isLoginResponse(result)) {
        setError('Conclua o cadastro na aba Criar conta.');
        setTab('criar');
        return;
      }
      await finishLojistaLogin(result);
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
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => {
            setTab('entrar');
            setPassword('');
            setShowPassword(false);
            setError(null);
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === 'entrar'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('criar');
            setPassword('');
            setShowPassword(false);
            setError(null);
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === 'criar'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        {tab === 'criar' && (
          <>
            <div>
              <label htmlFor="signupWhatsapp" className={labelClass}>
                WhatsApp
              </label>
              <input
                id="signupWhatsapp"
                name="whatsapp"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatBrMobileNational(e.target.value))}
                placeholder={BR_MOBILE_NATIONAL_PLACEHOLDER}
                className={fieldClass}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Celular pessoal do cadastro. O WhatsApp da loja fica opcional no
                Perfil.
              </p>
            </div>
            <div>
              <label htmlFor="ownerName" className={labelClass}>
                Nome do dono
              </label>
              <input
                id="ownerName"
                name="ownerName"
                autoComplete="name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Carlos Silva"
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label htmlFor="storeName" className={labelClass}>
                Nome da loja
              </label>
              <input
                id="storeName"
                name="storeName"
                autoComplete="organization"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Sapataria do Carlos"
                className={fieldClass}
                required
              />
            </div>
          </>
        )}

        {tab === 'entrar' ? (
          <div>
            <label htmlFor="loginIdentifier" className={labelClass}>
              Email ou WhatsApp
            </label>
            <input
              id="loginIdentifier"
              name="loginIdentifier"
              type="text"
              autoComplete="username"
              value={loginId}
              onChange={(e) =>
                setLoginId(formatLojistaLoginIdentifierInput(e.target.value))
              }
              placeholder="voce@loja.com.br"
              className={fieldClass}
              required
            />
          </div>
        ) : (
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
              placeholder="voce@loja.com.br"
              className={fieldClass}
              required
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={labelClass}>
              Senha
            </label>
            {tab === 'entrar' && (
              <Link
                href="/esqueci-senha"
                className="text-xs font-medium text-primary hover:underline"
              >
                Esqueci a senha
              </Link>
            )}
          </div>
          <div className="relative mt-1.5">
            <input
              key={tab === 'entrar' ? 'login-password' : 'register-password'}
              id="password"
              name={tab === 'entrar' ? 'login-password' : 'register-password'}
              type={showPassword ? 'text' : 'password'}
              autoComplete={tab === 'entrar' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'criar' ? 'Mínimo 8 caracteres' : undefined}
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

        {tab === 'criar' && (
          <div>
            <label htmlFor="cnpj" className={labelClass}>
              CNPJ
            </label>
            <input
              id="cnpj"
              name="cnpj"
              inputMode="numeric"
              autoComplete="off"
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className={fieldClass}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Precisa estar ativo na Receita. Consulta gratuita.
            </p>
            {cnpjLookupError && (
              <p role="alert" className="mt-1 text-xs text-red-700">
                {cnpjLookupError === CNPJ_INACTIVE_MESSAGE
                  ? CNPJ_INACTIVE_MESSAGE
                  : cnpjLookupError}
              </p>
            )}
          </div>
        )}

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
          disabled={loading || (tab === 'criar' && cnpjLookupError === CNPJ_INACTIVE_MESSAGE)}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Aguarde…'
            : tab === 'entrar'
              ? 'Entrar'
              : 'Criar conta grátis'}
        </button>
      </form>

      <div className="mt-4">
        <GoogleContinueButton
          disabled={loading}
          onIdToken={(token) => void onGoogleIdToken(token)}
          onError={setError}
        />
      </div>
    </div>
  );
}
