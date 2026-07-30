'use client';

import { CountUp } from '@/components/landing/count-up';
import { useInView } from '@/components/landing/use-in-view';

function formatBrl(n: number) {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function LandingProof() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="resultado"
      ref={ref}
      className="scroll-mt-20 overflow-hidden bg-foreground px-4 py-20 text-background sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p
            className={`text-xs font-semibold tracking-[0.16em] text-background/45 transition duration-700 ${
              inView ? 'opacity-100' : 'opacity-0'
            }`}
          >
            RESULTADO EM REAIS
          </p>
          <h2
            className={`mt-4 text-3xl font-bold tracking-tight sm:text-5xl sm:leading-[1.1] transition duration-700 ${
              inView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
          >
            Você vê o dinheiro voltar — não “engajamento”.
          </h2>
          <p
            className={`mx-auto mt-5 max-w-2xl text-background/65 transition duration-700 delay-100 ${
              inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            WhatsApp que vende: cupom, oferta e upsell. Painel em reais — quem
            pagou, o que levou, quanto voltou.
          </p>
        </div>

        <div
          className={`mx-auto mt-12 max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm sm:mt-14 sm:p-8 transition duration-700 delay-150 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-white/50">
                RECUPERAÇÃO · 30 DIAS
              </p>
              <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                <CountUp to={18420} active={inView} format={formatBrl} />
              </p>
            </div>
            <p className="pb-1 text-right text-sm text-emerald-300">
              <CountUp to={18} active={inView} /> vendas
              <br />
              recuperadas
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center">
            {[
              { label: 'Mensagens', value: '126' },
              { label: 'Cupons usados', value: '18' },
              { label: 'Ticket médio', value: 'R$ 329' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-lg font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-[11px] text-white/50">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl gap-8 text-left sm:mt-14 sm:grid-cols-3">
          {[
            {
              title: 'Vende de verdade',
              body: 'Cupom, oferta e upsell no timing certo — não é blast genérico.',
            },
            {
              title: 'Ticket maior',
              body: 'Recupera a venda e sobe o valor com o que faz sentido pro cliente.',
            },
            {
              title: '30 segundos',
              body: 'Cadastro no balcão — nome, WhatsApp e o que comprou ou quis.',
            },
          ].map((item, i) => (
            <li
              key={item.title}
              className={`transition duration-700 ${
                inView
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              }`}
              style={{ transitionDelay: `${250 + i * 80}ms` }}
            >
              <p className="font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
