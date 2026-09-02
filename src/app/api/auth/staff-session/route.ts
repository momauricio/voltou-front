import { NextResponse } from 'next/server';
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_COOKIE_PATH,
} from '@/lib/session-cookie';

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches API token

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    accessToken?: string;
  } | null;
  const accessToken = body?.accessToken?.trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: STAFF_SESSION_COOKIE_PATH,
    maxAge: MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: STAFF_SESSION_COOKIE_PATH,
    maxAge: 0,
  });
  return res;
}
