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

const BARS = [
  { label: 'Semana 1', h: '35%' },
  { label: 'Semana 2', h: '55%' },
  { label: 'Semana 3', h: '48%' },
  { label: 'Semana 4', h: '78%' },
];

export function DashboardMock() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div ref={ref} className="mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-foreground p-5 text-background shadow-[var(--shadow-lift)] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-white/50">
              RECUPERAÇÃO · 30 DIAS
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <CountUp to={18420} active={inView} format={formatBrl} />
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
            Exemplo
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
          <div>
            <p className="text-lg font-semibold text-white">
              <CountUp to={18} active={inView} />
            </p>
            <p className="mt-1 text-[11px] text-white/50">Vendas</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">126</p>
            <p className="mt-1 text-[11px] text-white/50">Mensagens</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">R$ 329</p>
            <p className="mt-1 text-[11px] text-white/50">Ticket médio</p>
          </div>
        </div>

        <div
          aria-hidden
          className="mt-6 flex h-28 items-end justify-between gap-2 border-t border-white/10 pt-5"
        >
          {BARS.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end justify-center">
                <div
                  className={`w-full max-w-[2.25rem] rounded-t-md bg-primary/80 transition-all duration-700 ${
                    inView ? 'opacity-100' : 'opacity-40'
                  }`}
                  style={{ height: inView ? bar.h : '12%' }}
                />
              </div>
              <span className="text-[10px] text-white/45">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Exemplo ilustrativo — não é resultado de um cliente real
      </p>
    </div>
  );
}
