import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';
import { isStaffRole } from '@/lib/staff-crm';
import { readJwtRole } from '@/lib/jwt-role';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPainel = pathname.startsWith('/painel');
  const isEquipe = pathname.startsWith('/equipe');
  if (!isPainel && !isEquipe) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const login = new URL('/entrar', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (isPainel && isStaffRole(readJwtRole(session))) {
    return NextResponse.redirect(new URL('/equipe', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/painel/:path*', '/equipe/:path*'],
};
