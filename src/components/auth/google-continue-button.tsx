'use client';

import Script from 'next/script';
import { useCallback, useRef } from 'react';
import { publicGoogleClientId } from '@/lib/lojista-signup';

type GoogleIdConfig = {
  client_id: string;
  callback: (response: { credential?: string }) => void;
  ux_mode?: 'popup' | 'redirect';
  auto_select?: boolean;
};

type GoogleIdApi = {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: string;
      theme?: string;
      size?: string;
      text?: string;
      shape?: string;
      width?: number;
      locale?: string;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

export function GoogleContinueButton({
  disabled,
  onIdToken,
  onError,
}: {
  disabled?: boolean;
  onIdToken: (idToken: string) => void;
  onError?: (message: string) => void;
}) {
  const clientId = publicGoogleClientId();
  const buttonRef = useRef<HTMLDivElement>(null);
  const onIdTokenRef = useRef(onIdToken);
  const onErrorRef = useRef(onError);
  onIdTokenRef.current = onIdToken;
  onErrorRef.current = onError;

  const initGis = useCallback(() => {
    const id = publicGoogleClientId();
    const host = buttonRef.current;
    const gis = window.google?.accounts?.id;
    if (!id || !host || !gis) return;

    gis.initialize({
      client_id: id,
      ux_mode: 'popup',
      auto_select: false,
      callback: (response) => {
        if (response.credential) {
          onIdTokenRef.current(response.credential);
          return;
        }
        onErrorRef.current?.('Não foi possível continuar com o Google.');
      },
    });

    host.replaceChildren();
    const width = Math.min(400, Math.max(240, Math.floor(host.clientWidth || 320)));
    gis.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      locale: 'pt-BR',
      width,
    });
  }, []);

  if (!clientId) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div
        className={disabled ? 'pointer-events-none opacity-60' : undefined}
        aria-label="Continuar com Google"
      >
        <div ref={buttonRef} className="flex min-h-11 w-full justify-center">
          <span className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground">
            Continuar com Google
          </span>
        </div>
      </div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGis}
      />
    </div>
  );
}
