import { NextResponse } from 'next/server';
import { loadOverview } from '@/lib/overview';
import { digestText, chequesText, dormantText, sendTelegram, collectionAlertsText } from '@/lib/telegram';
import { loadCollections } from '@/lib/collectionsData';
import { SESSION_COOKIE, sessionToken, authEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// دسترسی مجاز است اگر:
// ۱) کاربر داخل پنل لاگین کرده باشد (یا رمز ادمین تنظیم نشده باشد)
// ۲) یا کران‌جاب بیرونی secret درست بفرستد: GET /api/notify?secret=...&type=digest|cheques|dormant
async function isAllowed(req) {
  if (!authEnabled()) return true;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken())) return true;
  const secret = process.env.NOTIFY_SECRET;
  const given = req.nextUrl.searchParams.get('secret') || req.headers.get('x-notify-secret');
  return Boolean(secret) && given === secret;
}

async function handle(req) {
  if (!(await isAllowed(req))) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  try {
    const o = await loadOverview();
    const type = req.nextUrl.searchParams.get('type') || 'digest';
    let text = type === 'cheques' ? chequesText(o) : type === 'dormant' ? dormantText(o) : digestText(o);
    if (type !== 'dormant') {
      const extra = collectionAlertsText((await loadCollections(o)).alerts); // [collections]
      if (extra) text += '\n\n' + extra;
    }
    const r = await sendTelegram(text, o.settings?.telegramChatId);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
