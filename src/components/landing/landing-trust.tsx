'use client';

import { useInView } from '@/components/landing/use-in-view';

export function LandingTrust() {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <section
      id="confianca"
      ref={ref}
      className="scroll-mt-20 border-t border-border/60 bg-muted/40 px-4 py-20 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className={`text-3xl font-bold tracking-tight sm:text-4xl sm:leading-tight transition duration-700 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          O cliente não desconfia — porque é o WhatsApp da loja
        </h2>
        <p
          className={`mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg transition duration-700 delay-100 ${
            inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          A Voltou usa o número que o cliente já conhece. Sem perfil novo, sem
          “oi sumida” de desconhecido.
        </p>
      </div>
    </section>
  );
}
