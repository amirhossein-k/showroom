import { NextResponse } from 'next/server';
import { loadOverview } from '@/lib/overview';
import { digestText, chequesText, dormantText, sendTelegram } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// برای کران‌جاب آینده: GET /api/notify?secret=...&type=digest|cheques|dormant
async function handle(req) {
  const secret = process.env.NOTIFY_SECRET;
  const given = req.nextUrl.searchParams.get('secret') || req.headers.get('x-notify-secret');
  if (!secret || given !== secret) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  try {
    const o = await loadOverview();
    const type = req.nextUrl.searchParams.get('type') || 'digest';
    const text = type === 'cheques' ? chequesText(o) : type === 'dormant' ? dormantText(o) : digestText(o);
    const r = await sendTelegram(text, o.settings.telegramChatId);
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
