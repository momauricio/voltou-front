'use client';

import { useState } from 'react';
import { useInView } from '@/components/landing/use-in-view';

/**
 * FAQ alinhado ao ICP (loja física / WhatsApp / só comissão) e às objeções
 * mais comuns no Linear (doc 01 — Visão & ICP + princípios do produto).
 * Ajuste fino comercial: validar com o dono antes de tratar como policy legal.
 */
const FAQ_ITEMS = [
  {
    q: 'Preciso trocar o WhatsApp da loja?',
    a: 'Não. A conversa sai do número da sua loja — o mesmo que o cliente já conhece. Você não troca de número nem cria um perfil “Voltou” pra o cliente falar.',
  },
  {
    q: 'Como funciona a comissão? Vocês processam o pagamento?',
    a: 'O cliente paga no link da sua loja (hoje pelo Mercado Pago; outras formas de checkout vão entrar depois). O dinheiro da venda vai pra você. A Voltou só fica com a comissão quando essa venda recuperada entra. Sem mensalidade e sem cartão pra abrir a conta.',
  },
  {
    q: 'E se o cliente não quiser mais receber mensagem?',
    a: 'Se o cliente pedir pra parar, a gente respeita. Ele deixa de receber ofertas da loja por aqui — sem insistir, sem mandar de novo “só mais uma vez”.',
  },
  {
    q: 'Vocês vendem ou compartilham os dados dos meus clientes?',
    a: 'Não. Nome, telefone e o que a pessoa comprou ficam pra uso da sua loja — recuperar venda e avisar pedido. Não vendemos lista de clientes e não passamos esses dados pra terceiros fazerem marketing. A mensagem chega pelo WhatsApp da sua loja, não de um número estranho.',
  },
  {
    q: 'Preciso entender de tecnologia pra usar?',
    a: 'Não. No balcão você anota nome, WhatsApp e o que a pessoa comprou (ou quis) em cerca de 30 segundos. O restante — quando chamar, o que oferecer e o link de pagamento — a Voltou cuida. Não precisa de sistema de caixa nem de equipe de TI.',
  },
] as const;

export function LandingFaq() {
  const { ref, inView } = useInView<HTMLElement>();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-2xl">
        <h2
          className={`text-center text-3xl font-bold tracking-tight sm:text-4xl transition duration-700 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Perguntas frequentes
        </h2>

        <div
          className={`mt-10 divide-y divide-border rounded-2xl border border-border bg-card transition duration-700 delay-100 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground sm:text-[15px]"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-muted-foreground"
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen ? (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
