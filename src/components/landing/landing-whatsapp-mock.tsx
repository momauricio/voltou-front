'use client';

import { useInView } from '@/components/landing/use-in-view';

export function LandingWhatsappMock() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="prova"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className={`text-3xl font-bold tracking-tight sm:text-4xl transition duration-700 ${
              inView
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
          >
            Parece a loja falando. Porque é a loja.
          </h2>
          <p
            className={`mt-4 text-muted-foreground transition duration-700 delay-100 ${
              inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Mensagem no WhatsApp da sua loja · cupom · link de pagamento
          </p>
        </div>

        <div
          className={`relative mx-auto mt-12 w-full max-w-[340px] transition duration-700 delay-150 sm:mt-14 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <div className="overflow-hidden rounded-[2rem] border border-border bg-[#0b141a] shadow-[var(--shadow-lift)] ring-1 ring-black/5">
            <div className="flex items-center gap-3 border-b border-white/10 bg-[#1f2c34] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                V
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-white">
                  Calçados do Bairro
                </p>
                <p className="text-[11px] text-white/55">online</p>
              </div>
            </div>

            <div className="space-y-3 bg-[#0b141a] px-3 py-4">
              <p className="text-center text-[10px] text-white/40">Hoje</p>

              <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-left text-[13px] leading-snug text-white shadow-sm">
                Oi Marina! O tênis Nike Run que você levou — e a meia técnica
                que combina com ele.
                <br />
                <br />
                Cupom{' '}
                <span className="font-semibold tracking-wide">VOLTOU12</span>
                + meia com desconto. Pague no link e retire ou receba em casa 👟
                <span className="mt-1 block text-right text-[10px] text-white/55">
                  10:42 ✓✓
                </span>
              </div>

              <div className="mr-auto max-w-[75%] rounded-2xl rounded-tl-sm bg-[#1f2c34] px-3 py-2 text-left text-[13px] leading-snug text-white shadow-sm">
                Paguei! Quero retirar amanhã 💚
                <span className="mt-1 block text-right text-[10px] text-white/45">
                  10:44
                </span>
              </div>

              <div className="mx-auto w-fit rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
                Pago · +R$ 329 recuperados
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
