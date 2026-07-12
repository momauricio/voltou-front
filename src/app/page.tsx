export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-semibold tracking-tight">
          Voltou<span className="text-primary">.</span>
        </span>
        <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#como-funciona" className="hover:text-foreground">
            Como funciona
          </a>
          <a href="#recursos" className="hover:text-foreground">
            Recursos
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <section className="rounded-[var(--radius)] border border-border bg-card p-10 shadow-[var(--shadow-soft)] sm:p-14">
          <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
            Para sapatarias, boutiques e lojas de bairro
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Seus clientes já compraram uma vez.{" "}
            <span className="text-primary">O Voltou. faz eles voltarem.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Cadastra a venda em 30 segundos. A gente manda mensagem no WhatsApp
            no momento certo. Seu cliente volta achando que foi ele que lembrou
            de você.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Começar agora
            </a>
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Ver demonstração
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Você precisa recuperar 2 vendas/mês para pagar. A média é 18.
          </p>
        </section>

        <section id="como-funciona" className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: 'Cadastra a venda',
              body: 'Nome + WhatsApp + produto. 30 segundos no balcão.',
            },
            {
              title: 'IA decide o momento',
              body: '30, 60 ou 90 dias. Mensagem personalizada com cupom único.',
            },
            {
              title: 'O cliente volta',
              body: 'Você vê no painel quanto recuperou em reais.',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>

        <section id="recursos" className="mt-16 rounded-[var(--radius)] bg-accent/60 p-8">
          <p className="text-sm font-medium text-success">Feito para varejo brasileiro</p>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            LGPD-first: PII com hash/criptografia, credenciais BSP protegidas e
            isolamento multi-tenant na API NestJS e no Prisma.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Voltou.
      </footer>
    </div>
  );
}
