import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionToken } from '@/lib/auth';

const PUBLIC = ['/login', '/api/login', '/api/telegram/webhook', '/api/notify'];

export async function middleware(req) {
  if (!process.env.ADMIN_PASSWORD) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && token === (await sessionToken())) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'ابتدا وارد شوید' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
