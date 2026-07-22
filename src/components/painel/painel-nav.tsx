'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { clearClientSession } from '@/lib/api';

type NavItem = {
  href: string;
  label: string;
  short?: string;
  icon: ReactNode;
  exact?: boolean;
  mobilePrimary?: boolean;
};

const iconClass = 'h-5 w-5 shrink-0';

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: iconClass,
  'aria-hidden': true as const,
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/painel',
    label: 'Início',
    short: 'Início',
    exact: true,
    mobilePrimary: true,
    icon: (
      <svg {...iconProps}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      </svg>
    ),
  },
  {
    href: '/painel/clientes',
    label: 'Clientes',
    mobilePrimary: true,
    icon: (
      <svg {...iconProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/painel/produtos',
    label: 'Produtos',
    mobilePrimary: true,
    icon: (
      <svg {...iconProps}>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8" />
        <path d="M12 13v9" />
      </svg>
    ),
  },
  {
    href: '/painel/campanhas',
    label: 'Campanhas',
    short: 'Camp.',
    mobilePrimary: true,
    icon: (
      <svg {...iconProps}>
        <path d="m3 3 18 9-18 9 4-9-4-9Z" />
      </svg>
    ),
  },
  {
    href: '/painel/whatsapp',
    label: 'WhatsApp',
    short: 'Zap',
    mobilePrimary: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="currentColor"
        aria-hidden
      >
        <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.95.53 3.78 1.46 5.36L2 22l4.98-1.55a10.05 10.05 0 0 0 5.06 1.37h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.76 14.09c-.24.67-1.4 1.28-1.93 1.36-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.88-1.24-4.76-4.15-4.9-4.34-.15-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.2-.15.32-.29.5-.15.17-.3.35-.43.47-.15.13-.3.28-.13.55.18.27.79 1.3 1.7 2.11 1.17 1.04 2.15 1.36 2.45 1.51.3.15.48.13.66-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.34.08.13.08.74-.16 1.41Z" />
      </svg>
    ),
  },
  {
    href: '/painel/regras',
    label: 'Regras',
    icon: (
      <svg {...iconProps}>
        <path d="M4 6h10" />
        <path d="M4 12h6" />
        <path d="M4 18h13" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="13" cy="18" r="2" />
      </svg>
    ),
  },
];

function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PainelNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  function handleSair() {
    clearClientSession();
    router.push('/entrar');
  }

  const mobilePrimary = NAV_ITEMS.filter((i) => i.mobilePrimary);
  const secondary = NAV_ITEMS.filter((i) => !i.mobilePrimary);
  const bottomItems = mobilePrimary.slice(0, 4);
  const moreItems = [mobilePrimary[4], ...secondary].filter(
    Boolean,
  ) as NavItem[];

  // Portal to <body> — fixed elements break inside sticky header
  const mobileChrome =
    mounted &&
    createPortal(
      <>
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 shadow-[0_-4px_24px_oklch(22%_0.03_155_/_0.06)] backdrop-blur-md lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Navegação principal"
        >
          <ul className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-5 px-1">
            {bottomItems.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href} className="min-w-0">
                  <Link
                    href={item.href}
                    className={`flex h-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-medium transition ${
                      active
                        ? 'text-primary'
                        : 'text-muted-foreground active:bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl [&>svg]:h-[1.15rem] [&>svg]:w-[1.15rem] ${
                        active ? 'bg-accent' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="max-w-full truncate">
                      {item.short ?? item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="min-w-0">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-expanded={moreOpen}
                className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-medium active:bg-muted ${
                  moreOpen ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                    moreOpen ? 'bg-accent' : ''
                  }`}
                >
                  <svg {...iconProps} className="h-[1.15rem] w-[1.15rem]">
                    <circle
                      cx="5"
                      cy="12"
                      r="1.5"
                      fill="currentColor"
                      stroke="none"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="1.5"
                      fill="currentColor"
                      stroke="none"
                    />
                    <circle
                      cx="19"
                      cy="12"
                      r="1.5"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                </span>
                Mais
              </button>
            </li>
          </ul>
        </nav>

        {moreOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Fechar menu"
              onClick={() => setMoreOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Mais opções"
              className="absolute inset-x-0 bottom-0 max-h-[min(85dvh,32rem)] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-[var(--shadow-lift)]"
              style={{
                paddingBottom:
                  'calc(1rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  Mais opções
                </p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Fechar
                </button>
              </div>
              <ul className="space-y-1">
                {moreItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        isActive(pathname, item)
                          ? 'bg-accent text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/painel/perfil"
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      pathname?.startsWith('/painel/perfil')
                        ? 'bg-accent text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <svg {...iconProps}>
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20a8 8 0 0 1 16 0" />
                    </svg>
                    Perfil da loja
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleSair}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <svg {...iconProps}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sair
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </>,
      document.body,
    );

  return (
    <>
      {/* Desktop top nav */}
      <div className="hidden min-w-0 flex-1 items-center justify-between gap-3 lg:flex">
        <nav
          className="mx-auto flex max-w-full items-center gap-0.5 overflow-x-auto scroll-touch [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden xl:gap-1"
          aria-label="Navegação principal"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 text-sm font-medium transition xl:px-3 ${
                  active
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
                  {item.icon}
                </span>
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden">{item.short ?? item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/painel/perfil"
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
              pathname === '/painel/perfil' ||
              pathname?.startsWith('/painel/perfil/')
                ? 'bg-accent text-primary'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <svg {...iconProps} className="h-4 w-4">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
            <span className="hidden xl:inline">Perfil</span>
          </Link>
          <button
            type="button"
            onClick={handleSair}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          >
            <svg {...iconProps} className="h-4 w-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden xl:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile header: only profile — menu lives in bottom bar */}
      <div className="ml-auto flex shrink-0 items-center lg:hidden">
        <Link
          href="/painel/perfil"
          aria-label="Perfil"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${
            pathname?.startsWith('/painel/perfil')
              ? 'bg-accent text-primary'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <svg {...iconProps}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20a8 8 0 0 1 16 0" />
          </svg>
        </Link>
      </div>

      {mobileChrome}
    </>
  );
}
