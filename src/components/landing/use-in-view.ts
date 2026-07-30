'use client';

import { useEffect, useRef, useState } from 'react';

export function useInView<T extends HTMLElement>(margin = '-80px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: margin, threshold: 0.12 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);

  return { ref, inView };
}
