'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  clearClientSession,
  fetchAuthMe,
  getStoredAccessToken,
} from '@/lib/api';
import { BrandLogo } from '@/components/brand-logo';

type NavItem = {
  href: string;
  label: string;
  short?: string;
  icon: ReactNode;
  exact?: boolean;
  mobilePrimary?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
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

/**
 * RCD attention hierarchy: lead with the activation path
 * (campanhas / WhatsApp) after the home overview — not a flat feature list.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    items: [
      {
        href: '/painel',
        label: 'Dashboard',
        short: 'Início',
        exact: true,
        mobilePrimary: true,
        icon: (
          <svg {...iconProps}>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
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
        href: '/painel/pedidos',
        label: 'Pedidos',
        short: 'Pedidos',
        mobilePrimary: true,
        icon: (
          <svg {...iconProps}>
            <path d="M6 2h12v4H6z" />
            <path d="M4 6h16l-1 14H5L4 6Z" />
            <path d="M9 10h6" />
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
    ],
  },
  {
    id: 'conta',
    label: 'Conta',
    items: [
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
      {
        href: '/painel/perfil',
        label: 'Configurações',
        short: 'Perfil',
        icon: (
          <svg {...iconProps}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20a8 8 0 0 1 16 0" />
          </svg>
        ),
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
  variant = 'sidebar',
}: {
  item: NavItem;
  pathname: string | null;
  onNavigate?: () => void;
  variant?: 'sidebar' | 'mobile';
}) {
  const active = isActive(pathname, item);

  if (variant === 'mobile') {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
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
        <span className="max-w-full truncate">{item.short ?? item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground/80 hover:bg-muted hover:text-foreground'
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center [&>svg]:h-[1.15rem] [&>svg]:w-[1.15rem] ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function PainelSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [storeName, setStoreName] = useState('Sua loja');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    void fetchAuthMe(token)
      .then(({ user }) => {
        setStoreName(user.storeName || 'Sua loja');
        setOwnerName(user.ownerName || '');
        setEmail(user.email || '');
      })
      .catch(() => undefined);
  }, []);

  function handleSair() {
    clearClientSession();
    router.push('/entrar');
  }

  const initial = (ownerName || storeName || 'V').trim().charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[16.5rem] shrink-0 flex-col border-r border-border/80 bg-card lg:flex">
      <div className="flex h-full min-h-0 flex-col px-3 py-4">
        <div className="px-2 pb-4">
          <BrandLogo href="/painel" />
        </div>

        <Link
          href="/painel/perfil"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-border/80 bg-background/60 px-3 py-2.5 transition hover:border-primary/30 hover:bg-accent/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {storeName}
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Lojista
            </span>
          </span>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Link>

        <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="Navegação principal">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-3 border-t border-border/80 pt-3">
          <div className="mb-2 flex items-center gap-2.5 px-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {ownerName || storeName}
              </span>
              {email ? (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {email}
                </span>
              ) : null}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSair}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <svg {...iconProps} className="h-[1.15rem] w-[1.15rem]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Mobile top strip + bottom tab bar (desktop nav lives in PainelSidebar). */
export function PainelMobileChrome() {
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

  const mobilePrimary = ALL_ITEMS.filter((i) => i.mobilePrimary);
  const bottomItems = mobilePrimary.slice(0, 4);
  const moreItems = [
    ...mobilePrimary.slice(4),
    ...ALL_ITEMS.filter((i) => !i.mobilePrimary),
  ];

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
            {bottomItems.map((item) => (
              <li key={item.href} className="min-w-0">
                <NavLink item={item} pathname={pathname} variant="mobile" />
              </li>
            ))}
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
                    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
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
                <p className="text-sm font-semibold text-foreground">Mais opções</p>
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
                          ? 'bg-primary text-primary-foreground'
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
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-4">
          <BrandLogo href="/painel" className="min-w-0 shrink" />
          <div className="ml-auto">
            <Link
              href="/painel/perfil"
              aria-label="Configurações"
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
        </div>
      </header>
      {mobileChrome}
    </>
  );
}

/** @deprecated Prefer PainelSidebar + PainelMobileChrome */
export function PainelNav() {
  return <PainelMobileChrome />;
}
