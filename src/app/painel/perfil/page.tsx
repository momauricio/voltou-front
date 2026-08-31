'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/painel/page-header';
import { CheckoutBrandingCard } from '@/components/painel/checkout-branding-card';
import { FulfillmentSettingsCard } from '@/components/painel/fulfillment-settings-card';
import { PaymentProvidersCard } from '@/components/painel/payment-providers-card';
import { WhatsappConnectCard } from '@/components/painel/whatsapp-connect-card';
import { changePassword, clearClientSession, getStoredAccessToken } from '@/lib/api';

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function PerfilPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSair() {
    clearClientSession();
    router.push('/entrar');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);

    if (novaSenha.length < 8) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }
    if (senhaAtual === novaSenha) {
      setErro('A nova senha deve ser diferente da atual.');
      return;
    }

    const token = getStoredAccessToken();
    if (!token) {
      setErro('Sessão expirada. Entre novamente para trocar a senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(token, {
        currentPassword: senhaAtual,
        newPassword: novaSenha,
      });
      setOk(res.message);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Perfil"
        subtitle="Gerencie WhatsApp, pagamentos, entrega, aparência do checkout e a segurança do acesso."
      />

      <WhatsappConnectCard />

      <Suspense fallback={null}>
        <PaymentProvidersCard />
      </Suspense>

      <FulfillmentSettingsCard />

      <CheckoutBrandingCard />

      <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] lg:mx-0">
        <h2 className="text-base font-semibold text-foreground">Trocar senha</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use uma senha forte. Depois de trocar, você continua logado nesta sessão.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="senhaAtual" className="text-sm font-medium text-foreground">
              Senha atual
            </label>
            <input
              id="senhaAtual"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label htmlFor="novaSenha" className="text-sm font-medium text-foreground">
              Nova senha
            </label>
            <input
              id="novaSenha"
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={fieldClass}
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="confirmarSenha" className="text-sm font-medium text-foreground">
              Confirmar nova senha
            </label>
            <input
              id="confirmarSenha"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={fieldClass}
              required
              minLength={8}
            />
          </div>

          {erro && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
          {ok && (
            <p className="rounded-xl border border-border bg-accent/50 px-3 py-2 text-sm text-foreground">
              {ok}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] lg:mx-0">
        <h2 className="text-base font-semibold text-foreground">Sair</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encerra a sessão neste dispositivo. Você pode entrar de novo quando quiser.
        </p>
        <button
          type="button"
          onClick={handleSair}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          Sair da conta
        </button>
      </section>
    </div>
  );
}
