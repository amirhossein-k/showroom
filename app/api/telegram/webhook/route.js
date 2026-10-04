import { NextResponse } from 'next/server';
import { loadOverview } from '@/lib/overview';
import { getSettings } from '@/lib/settings';
import { connectDB } from '@/lib/db';
import { Customer } from '@/lib/models';
import { parseCustomerStartParam } from '@/lib/customerLink';
import { digestText, chequesText, dormantText, sendTelegram, esc } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// آدرس وبهوک: https://YOUR_DOMAIN/api/telegram/webhook
export async function POST(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = await req.json().catch(() => ({}));
  const msg = update.message || update.edited_message;
  if (!msg?.text) return NextResponse.json({ ok: true });
  const chatId = String(msg.chat.id);
  const [rawCmd, arg] = msg.text.trim().split(/\s+/);
  const cmd = rawCmd.split('@')[0];

  try {
    // [جدید] اتصال مشتری با لینک دعوت: t.me/BOT?start=c_<id>_<sig>
    if (cmd === '/start' && arg) {
      const customerId = parseCustomerStartParam(arg);
      if (customerId) {
        await connectDB();
        const c = await Customer.findByIdAndUpdate(customerId, { $set: { telegramChatId: chatId, notifyOptIn: true, lastContact: new Date() } }, { new: true });
        const s = await getSettings();
        await sendTelegram(
          c
            ? `سلام ${esc(c.name)} 👋\nبه ربات ${esc(s.showroomName)} وصل شدی. هر وقت ماشینی که دنبالشی${c.wanted ? ` (${esc(c.wanted)})` : ''} برسد، همین‌جا خبرت می‌کنیم.\nبرای لغو: /stop`
            : 'لینک نامعتبر است.',
          chatId
        );
        return NextResponse.json({ ok: true });
      }
    }
    if (cmd === '/stop') {
      await connectDB();
      const r = await Customer.updateMany({ telegramChatId: chatId }, { $set: { notifyOptIn: false } });
      if (r.modifiedCount) {
        await sendTelegram('باشه، دیگر پیام معرفی خودرو برایت نمی‌فرستیم. برای فعال‌سازی دوباره لینک را از نمایشگاه بگیر.', chatId);
        return NextResponse.json({ ok: true });
      }
    }

    const settings = await getSettings();
    const owner = String(settings.telegramChatId || process.env.TELEGRAM_OWNER_CHAT_ID || '');

    if (cmd === '/start' || cmd === '/id') {
      await sendTelegram(
        `سلام ${esc(msg.from?.first_name || '')} 👋\nشناسه چت شما: ${chatId}\nاین عدد را در «تنظیمات» پنل وارد کنید تا هشدارها برایتان ارسال شود.\n\nدستورات: /report گزارش کامل · /cheques چک‌ها · /dormant خواب سرمایه`,
        chatId
      );
      return NextResponse.json({ ok: true });
    }
    if (!owner || owner !== chatId) {
      await sendTelegram('⛔️ این ربات فقط به صاحب نمایشگاه گزارش می‌دهد.', chatId);
      return NextResponse.json({ ok: true });
    }
    const o = await loadOverview();
    const text = cmd === '/cheques' ? chequesText(o) : cmd === '/dormant' ? dormantText(o) : digestText(o);
    await sendTelegram(text, chatId);
  } catch (e) {
    await sendTelegram('خطا در تهیه گزارش: ' + esc(e.message), chatId);
  }
  return NextResponse.json({ ok: true });
}
