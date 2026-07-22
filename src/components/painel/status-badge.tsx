type Tone = 'success' | 'warning' | 'muted' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-amber-100 text-amber-700',
  muted: 'bg-muted text-muted-foreground',
  danger: 'bg-red-100 text-red-700',
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === 'success'
            ? 'bg-success'
            : tone === 'warning'
              ? 'bg-amber-500'
              : tone === 'danger'
                ? 'bg-red-500'
                : 'bg-muted-foreground'
        }`}
      />
      {label}
    </span>
  );
}
