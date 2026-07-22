'use client';

import { useEffect, useState } from 'react';

type HealthResponse = {
  status: string;
  service: string;
  database: 'up' | 'down';
  timestamp: string;
};

type ConnectionState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: HealthResponse }
  | { kind: 'error'; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function ApiStatus() {
  const [state, setState] = useState<ConnectionState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const health = (await res.json()) as HealthResponse;
        if (!cancelled) {
          setState({ kind: 'ok', health });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message:
              error instanceof Error ? error.message : 'Falha ao conectar',
          });
        }
      }
    }

    void check();
    const id = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <p className="text-xs text-muted-foreground">Conectando à API…</p>
    );
  }

  if (state.kind === 'error') {
    return (
      <p className="text-xs text-muted-foreground">
        API offline ({API_URL}) — {state.message}
      </p>
    );
  }

  const dbLabel =
    state.health.database === 'up' ? 'banco ok' : 'banco offline';

  return (
    <p className="text-xs text-muted-foreground">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
      API conectada · {dbLabel}
    </p>
  );
}
