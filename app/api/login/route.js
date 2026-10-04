import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionToken } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'رمز اشتباه است' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
