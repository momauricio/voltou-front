import Link from 'next/link';
import { LOJISTA_SESSION_MESSAGE, STAFF_LOGIN_PATH } from '@/lib/staff-crm';

export function StaffForbidden() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Sessão de lojista
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {LOJISTA_SESSION_MESSAGE}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/painel"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Ir ao painel da loja
        </Link>
        <Link
          href={STAFF_LOGIN_PATH}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
        >
          Entrar com conta da equipe
        </Link>
      </div>
    </div>
  );
}
