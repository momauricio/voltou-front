'use client';

const STEPS = [
  { n: '1', label: 'Cadastra', hint: 'No balcão' },
  { n: '2', label: 'IA vende', hint: 'Produto + cupom' },
  { n: '3', label: 'Cliente paga', hint: 'WA da loja' },
  { n: '4', label: 'Você recebe', hint: 'Dinheiro + aviso' },
];

export function JourneyStrip() {
  return (
    <ol className="flex w-full gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:pb-0">
      {STEPS.map((step, i) => (
        <li
          key={step.n}
          className="relative flex min-w-[7.5rem] flex-1 flex-col items-center text-center sm:min-w-0"
        >
          {i < STEPS.length - 1 ? (
            <span
              aria-hidden
              className="pointer-events-none absolute top-4 left-[calc(50%+1.25rem)] hidden h-px w-[calc(100%-2.5rem)] bg-border sm:block"
            />
          ) : null}
          <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {step.n}
          </span>
          <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">
            {step.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{step.hint}</p>
        </li>
      ))}
    </ol>
  );
}
