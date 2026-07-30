'use client';

import { useEffect, useState } from 'react';

type CountUpProps = {
  to: number;
  active: boolean;
  durationMs?: number;
  prefix?: string;
  format?: (n: number) => string;
};

export function CountUp({
  to,
  active,
  durationMs = 1200,
  prefix = '',
  format,
}: CountUpProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    const start = performance.now();
    const from = Math.max(0, Math.round(to * 0.05));

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, durationMs]);

  const formatted = format
    ? format(value)
    : value.toLocaleString('pt-BR');

  return (
    <span className="tabular-nums">
      {prefix}
      {formatted}
    </span>
  );
}
