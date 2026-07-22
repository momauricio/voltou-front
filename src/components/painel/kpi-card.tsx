type Tone = 'positive' | 'negative' | 'neutral';

type KpiCardProps = {
  label: string;
  value: string;
  delta?: string;
  tone?: Tone;
  hint?: string;
  /** Destaque visual — use no KPI de receita (atenção primária) */
  emphasis?: boolean;
};

const toneClass: Record<Tone, string> = {
  positive: 'text-success',
  negative: 'text-red-600',
  neutral: 'text-muted-foreground',
};

export function KpiCard({
  label,
  value,
  delta,
  tone = 'neutral',
  hint,
  emphasis = false,
}: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        emphasis
          ? 'border-primary/25 bg-gradient-to-br from-accent via-card to-card shadow-[var(--shadow-lift)]'
          : 'border-border bg-card shadow-[var(--shadow-soft)]'
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">
        {label}
      </p>
      <p
        className={`mt-1.5 font-semibold tracking-tight text-foreground sm:mt-2 ${
          emphasis
            ? 'text-xl text-primary sm:text-3xl'
            : 'text-lg sm:text-2xl'
        }`}
      >
        {value}
      </p>
      {(delta || hint) && (
        <p className={`mt-1.5 text-[11px] font-medium sm:text-xs ${toneClass[tone]}`}>
          {delta}
          {delta && hint && <span className="text-muted-foreground"> · </span>}
          {hint && (
            <span className="font-normal text-muted-foreground">{hint}</span>
          )}
        </p>
      )}
    </div>
  );
}
