import { BrandLogo } from '@/components/brand-logo';

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <BrandLogo />
        <nav className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground sm:gap-6">
          <a href="#como-funciona" className="hidden hover:text-foreground sm:inline">
            Como funciona
          </a>
          <a href="#para-quem" className="hidden hover:text-foreground sm:inline">
            Para quem
          </a>
          <a href="/entrar" className="px-2 hover:text-foreground">
            Entrar
          </a>
          <a
            href="/entrar?tab=criar"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:px-4"
          >
            <span className="sm:hidden">Testar</span>
            <span className="hidden sm:inline">Testar grátis</span>
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6 sm:pb-24 sm:pt-8">
        {/* Hero — problem-aware: cost & urgency (Schwartz) */}
        <section className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-card px-5 py-10 shadow-[var(--shadow-soft)] sm:px-14 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(93%_0.04_150)_0%,transparent_55%)]"
          />
          <div className="relative">
            <p className="mb-3 text-sm font-medium text-primary sm:mb-4">
              Para sapatarias, boutiques e lojas de bairro
            </p>
            <h1 className="max-w-3xl text-[1.75rem] font-semibold leading-[1.15] tracking-tight sm:text-5xl sm:leading-[1.1]">
              Todo mês, clientes que já confiaram em você{' '}
              <span className="text-primary">compram em outro lugar</span> — e
              você nem fica sabendo.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:mt-5 sm:text-lg">
              O Voltou. avisa no WhatsApp no momento certo pra eles voltarem.
              Você cadastra a venda em 30 segundos. Eles acham que lembraram
              sozinhos.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-start">
              <div className="w-full sm:w-auto">
                <a
                  href="/entrar?tab=criar"
                  className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:w-auto"
                >
                  Recuperar minha primeira venda
                </a>
                <p className="mt-2 text-center text-xs text-muted-foreground sm:text-left">
                  Conta grátis · sem cartão · pronto em ~2 minutos
                </p>
              </div>
              <a
                href="#como-funciona"
                className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-muted sm:w-auto"
              >
                Ver como funciona
              </a>
            </div>

            <p className="mt-7 max-w-xl border-l-2 border-primary/40 pl-4 text-sm text-muted-foreground sm:mt-8">
              <span className="font-medium text-foreground">
                2 vendas recuperadas/mês
              </span>{' '}
              já pagam a ferramenta. A média de quem usa é 18.
            </p>
          </div>
        </section>

        {/* Mechanism — skim, don't read */}
        <section id="como-funciona" className="mt-14 scroll-mt-20 sm:mt-20">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Três passos. O resto é automático.
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Feito pro balcão — não pra ficar logado no computador.
          </p>
          <ol className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-3">
            {[
              {
                n: '1',
                title: 'Cadastra a venda',
                body: 'Nome, WhatsApp e produto. 30 segundos enquanto embala.',
              },
              {
                n: '2',
                title: 'A gente escolhe o momento',
                body: '30, 60 ou 90 dias — mensagem com o produto certo e cupom único.',
              },
              {
                n: '3',
                title: 'Você vê o dinheiro voltar',
                body: 'Painel em reais: quem voltou, o que comprou, quanto recuperou.',
              },
            ].map((item) => (
              <li key={item.n} className="relative">
                <span className="text-sm font-semibold text-primary">
                  Passo {item.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Transformation / specificity — not features */}
        <section className="mt-14 grid gap-8 border-y border-border py-12 sm:mt-20 sm:gap-16 sm:grid-cols-2 sm:py-16">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Marketing caro. CRM complicado. Planilha que ninguém abre.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Loja de bairro não precisa de funil de 12 etapas. Precisa que o
              cliente que já comprou — e gostou — volte antes de ir pra
              concorrência.
            </p>
          </div>
          <ul className="space-y-5 text-sm">
            {[
              {
                title: 'WhatsApp no timing certo',
                body: 'Não é blast. É lembrete personalizado quando o produto costuma acabar.',
              },
              {
                title: 'Cupom único por cliente',
                body: 'Você sabe exatamente quem voltou por causa da mensagem.',
              },
              {
                title: 'ROI em reais, não em “engajamento”',
                body: 'O painel mostra recuperação — não curtidas.',
              },
            ].map((item) => (
              <li key={item.title}>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Filter ICP — cut CAC on the page */}
        <section id="para-quem" className="mt-14 scroll-mt-20 sm:mt-20">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Feito pra quem vende no balcão — não pra e-commerce gigante.
          </h2>
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6">
            <div className="rounded-[var(--radius)] border border-primary/30 bg-accent/50 p-5 sm:p-6">
              <p className="text-sm font-semibold text-primary">Serve pra você se</p>
              <ul className="mt-4 space-y-2 text-sm text-foreground">
                <li>Tem loja física (calçado, moda, acessórios, presente)</li>
                <li>Já tem WhatsApp Business e atende cliente pelo celular</li>
                <li>Quer recompra sem contratar agência ou CRM caro</li>
              </ul>
            </div>
            <div className="rounded-[var(--radius)] border border-border bg-muted/40 p-5 sm:p-6">
              <p className="text-sm font-semibold text-muted-foreground">
                Provavelmente não é pra você se
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Só vende online em marketplace e não tem contato do cliente</li>
                <li>Precisa de ERP completo, estoque avançado ou PDV fiscal</li>
                <li>Quer disparar milhares de mensagens genéricas por dia</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Risk reduction + final CTA */}
        <section className="mt-14 rounded-[var(--radius)] bg-foreground px-5 py-10 text-background sm:mt-20 sm:px-12 sm:py-12">
          <h2 className="max-w-xl text-xl font-semibold tracking-tight sm:text-3xl">
            Comece hoje. Se em 30 dias não recuperar pelo menos 2 vendas, você
            cancela.
          </h2>
          <p className="mt-4 max-w-lg text-sm text-background/70">
            Sem fidelidade. Sem cartão pra criar a conta. LGPD: dados do cliente
            ficam protegidos — você controla o que sai no WhatsApp.
          </p>
          <a
            href="/entrar?tab=criar"
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:w-auto"
          >
            Criar conta e cadastrar a 1ª venda
          </a>
          <p className="mt-3 text-center text-xs text-background/55 sm:text-left">
            Leva ~2 minutos · sem cartão
          </p>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Voltou. ·{' '}
        <a href="/entrar" className="hover:text-foreground">
          Entrar
        </a>
      </footer>
    </div>
  );
}
