// امکانات تکمیلی تلگرام: انتشار آگهی در کانال + خبر دادن به مشتری‌های منتظر
import { readFile } from 'fs/promises';
import path from 'path';
import { esc } from './telegram';
import { priceShort, formatNumber, toFa } from './persian';
import { bodySummary } from './inspection';
import { matchCustomers } from './matching';

const apiBase = () => (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');
const token = () => process.env.TELEGRAM_BOT_TOKEN;

async function tg(method, payload) {
  if (!token()) return { ok: false, description: 'TELEGRAM_BOT_TOKEN تنظیم نشده است.' };
  const isForm = payload instanceof FormData;
  try {
    const res = await fetch(`${apiBase()}/bot${token()}/${method}`, {
      method: 'POST',
      headers: isForm ? undefined : { 'Content-Type': 'application/json' },
      body: isForm ? payload : JSON.stringify(payload),
      cache: 'no-store',
    });
    return await res.json();
  } catch (e) {
    return { ok: false, description: 'ارتباط با سرور تلگرام برقرار نشد.' };
  }
}

export function siteUrl() {
  const s = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  return s.replace(/\/$/, '');
}

// عکس‌های /api/files پشت لاگین هستند، پس فایل را مستقیم از دیسک می‌خوانیم و آپلود می‌کنیم
async function loadImage(url) {
  if (!url) return null;
  if (url.startsWith('/api/files/')) {
    const name = path.basename(url);
    try {
      const buf = await readFile(path.join(process.cwd(), 'uploads', name));
      return { blob: new Blob([buf]), name };
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//.test(url)) {
    // عکس را خودمان دانلود و به تلگرام آپلود می‌کنیم؛ سرورهای تلگرام ممکن است به هاست ایرانی دسترسی نداشته باشند
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return { blob: new Blob([await res.arrayBuffer()]), name: path.basename(new URL(url).pathname) || 'photo.jpg' };
    } catch {}
    return { url };
  }
  return null;
}

export function carCaption(car, settings = {}, { sold = false } = {}) {
  const lines = [];
  if (sold) lines.push('✅ <b>فروخته شد</b>\n');
  lines.push(`🚗 <b>${esc(car.brand)} ${esc(car.model)}${car.trim ? ' ' + esc(car.trim) : ''}</b> مدل ${toFa(car.year || '')}`);
  if (car.color) lines.push(`🎨 رنگ: ${esc(car.color)}`);
  lines.push(`🛣 کارکرد: ${formatNumber(car.mileage || 0)} کیلومتر`);
  if (car.inspection && Object.keys(car.inspection.body || {}).length) lines.push(`🔍 بدنه: ${esc(bodySummary(car.inspection))}`);
  if (car.insuranceExpiry) lines.push('🛡 بیمه دارد');
  if (!sold) lines.push(car.askingPrice ? `💰 قیمت: <b>${priceShort(car.askingPrice)} تومان</b>` : '💰 قیمت: تماس بگیرید');
  const contact = [settings.showroomName && `🏢 ${esc(settings.showroomName)}`, settings.showroomPhone && `📞 ${toFa(esc(settings.showroomPhone))}`, settings.showroomAddress && `📍 ${esc(settings.showroomAddress)}`]
    .filter(Boolean)
    .join('\n');
  if (contact) lines.push('\n' + contact);
  return lines.join('\n').slice(0, 1020); // سقف کپشن تلگرام ۱۰۲۴ کاراکتر
}

async function sendCarMessage(chatId, car, caption) {
  const imgs = (await Promise.all((car.images || []).slice(0, 10).map(loadImage))).filter(Boolean);

  if (imgs.length > 1) {
    const form = new FormData();
    form.append('chat_id', chatId);
    const media = imgs.map((img, i) => {
      if (img.blob) form.append(`f${i}`, img.blob, img.name);
      return { type: 'photo', media: img.url || `attach://f${i}`, ...(i === 0 ? { caption, parse_mode: 'HTML' } : {}) };
    });
    form.append('media', JSON.stringify(media));
    const r = await tg('sendMediaGroup', form);
    if (r.ok) return { ok: true, messageId: r.result[0].message_id, kind: 'photo' };
  } else if (imgs.length === 1) {
    const img = imgs[0];
    let r;
    if (img.blob) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('photo', img.blob, img.name);
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
      r = await tg('sendPhoto', form);
    } else {
      r = await tg('sendPhoto', { chat_id: chatId, photo: img.url, caption, parse_mode: 'HTML' });
    }
    if (r.ok) return { ok: true, messageId: r.result.message_id, kind: 'photo' };
  }
  // بدون عکس یا اگر ارسال عکس شکست خورد
  const r = await tg('sendMessage', { chat_id: chatId, text: caption, parse_mode: 'HTML', disable_web_page_preview: true });
  return r.ok ? { ok: true, messageId: r.result.message_id, kind: 'text' } : { ok: false, error: r.description };
}

export function channelId(settings = {}) {
  return settings.telegramChannelId || process.env.TELEGRAM_CHANNEL_ID || '';
}

// انتشار آگهی در کانال. ربات باید ادمین کانال باشد.
export async function postCarToChannel(car, settings = {}) {
  const chat = channelId(settings);
  if (!chat) return { ok: false, error: 'شناسه کانال تلگرام تنظیم نشده است.' };
  const r = await sendCarMessage(chat, car, carCaption(car, settings));
  if (!r.ok) return r;
  return { ok: true, channelPost: { chatId: chat, messageId: r.messageId, kind: r.kind, postedAt: new Date(), soldMarked: false } };
}

// بعد از فروش، آگهی کانال را «فروخته شد» می‌کنیم
export async function markSoldInChannel(car, settings = {}) {
  const cp = car.channelPost;
  if (!cp?.messageId || cp.soldMarked) return { ok: false, error: 'آگهی منتشرشده‌ای برای این خودرو نیست.' };
  const caption = carCaption(car, settings, { sold: true });
  const r =
    cp.kind === 'photo'
      ? await tg('editMessageCaption', { chat_id: cp.chatId, message_id: cp.messageId, caption, parse_mode: 'HTML' })
      : await tg('editMessageText', { chat_id: cp.chatId, message_id: cp.messageId, text: caption, parse_mode: 'HTML' });
  return r.ok ? { ok: true } : { ok: false, error: r.description };
}

// به مشتری‌هایی که دنبال همین ماشین بودند خبر بده (فقط یک بار برای هر ماشین)
export async function notifyMatchingCustomers(car, customers, settings = {}) {
  const already = new Set((car.notifiedCustomers || []).map(String));
  const targets = matchCustomers(car, customers).filter((c) => c.telegramChatId && c.notifyOptIn !== false && !already.has(String(c._id)));
  const sent = [];
  const errors = [];
  for (const c of targets) {
    const intro = `سلام ${esc(c.name)} عزیز 👋\nماشینی که دنبالش بودی${c.wanted ? ` (${esc(c.wanted)})` : ''} رسید:\n\n`;
    const r = await sendCarMessage(c.telegramChatId, car, (intro + carCaption(car, settings)).slice(0, 1020));
    if (r.ok) sent.push(String(c._id));
    else errors.push(`${c.name}: ${r.error}`);
  }
  const withoutTelegram = matchCustomers(car, customers).filter((c) => !c.telegramChatId).map((c) => ({ _id: c._id, name: c.name, phone: c.phone }));
  return { ok: true, sent, errors, withoutTelegram };
}
