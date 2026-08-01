'use client';

import { useEffect, useState } from 'react';

type CountUpProps = {
  to: number;
  active: boolean;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
};

export function CountUp({
  to,
  active,
  durationMs = 1200,
  format = (n) => String(Math.round(n)),
  className,
}: CountUpProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, durationMs]);

  return <span className={className}>{format(value)}</span>;
}
