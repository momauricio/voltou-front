'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
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
 * Five first-class tabs only. Config (WhatsApp, pagamentos, Sair) lives on Perfil.
 */
const NAV_ITEMS: NavItem[] = [
  {
    href: '/painel',
    label: 'Dashboard',
    exact: true,
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
    href: '/painel/clientes',
    label: 'Clientes',
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
    icon: (
      <svg {...iconProps}>
        <path d="M6 2h12v4H6z" />
        <path d="M4 6h16l-1 14H5L4 6Z" />
        <path d="M9 10h6" />
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

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className ?? iconClass}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
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
              Perfil
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto" aria-label="Navegação principal">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mobileChrome =
    mounted &&
    createPortal(
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 shadow-[0_-4px_24px_oklch(22%_0.03_155_/_0.06)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navegação principal"
      >
        <ul className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-5 px-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="min-w-0">
              <NavLink item={item} pathname={pathname} variant="mobile" />
            </li>
          ))}
        </ul>
      </nav>,
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
              aria-label="Perfil"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${
                pathname?.startsWith('/painel/perfil')
                  ? 'bg-accent text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <ProfileIcon />
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
