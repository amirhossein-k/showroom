// همگام‌سازی آگهی کانال تلگرام بعد از ویرایش پروندهٔ خودرو
import { carCaption, channelId, postCarToChannel } from './telegramExtra';

const apiBase = () => (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');
const token = () => process.env.TELEGRAM_BOT_TOKEN;

async function tg(method, payload) {
  if (!token()) return { ok: false, description: 'TELEGRAM_BOT_TOKEN تنظیم نشده است.' };
  try {
    const res = await fetch(`${apiBase()}/bot${token()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    return await res.json();
  } catch {
    return { ok: false, description: 'ارتباط با سرور تلگرام برقرار نشد.' };
  }
}

/** امضای عکس‌ها: اگر عوض شود یعنی عکس‌ها تغییر کرده‌اند */
export const imagesKey = (car) => (car.images || []).slice(0, 10).join('|');

const notModified = (r) => /not modified/i.test(r?.description || '');
const notFound = (r) => /not found|can't be edited|MESSAGE_ID_INVALID/i.test(r?.description || '');

async function deletePost(cp) {
  const count = Math.max(1, Number(cp.count) || 1);
  let ok = true;
  for (let i = 0; i < count; i++) {
    const r = await tg('deleteMessage', { chat_id: cp.chatId, message_id: cp.messageId + i });
    if (!r.ok && i === 0) ok = false;
  }
  return ok;
}

function withMeta(channelPost, car, caption) {
  return { ...channelPost, imagesKey: imagesKey(car), caption, count: Math.max(1, Math.min(10, (car.images || []).length)) };
}

async function repost(car, settings, cp) {
  if (cp?.messageId) await deletePost(cp); // اگر قدیمی‌تر از ۴۸ ساعت باشد تلگرام اجازه حذف نمی‌دهد؛ مهم نیست
  const r = await postCarToChannel(car, settings);
  if (!r.ok) return r;
  return { ok: true, changed: true, reposted: true, channelPost: withMeta(r.channelPost, car, carCaption(car, settings)) };
}

/**
 * بعد از ویرایش خودرو صدا زده می‌شود.
 * - اگر فقط متن عوض شده باشد: کپشن/متن همان پیام ویرایش می‌شود.
 * - اگر عکس‌ها عوض شده باشد: آگهی قبلی حذف و آگهی جدید منتشر می‌شود.
 * خروجی: { ok, changed, channelPost? }
 */
export async function syncCarInChannel(car, settings = {}) {
  const cp = car.channelPost;
  if (!cp?.messageId) return { ok: true, changed: false };
  if (!channelId(settings) && !cp.chatId) return { ok: false, error: 'شناسه کانال تلگرام تنظیم نشده است.' };

  const sold = !!cp.soldMarked;
  const caption = carCaption(car, settings, { sold });
  const imagesChanged = cp.imagesKey !== undefined && cp.imagesKey !== null && cp.imagesKey !== imagesKey(car);

  if (imagesChanged && !sold) return repost(car, settings, cp);
  if (cp.caption === caption && !imagesChanged) return { ok: true, changed: false };

  const r =
    cp.kind === 'photo'
      ? await tg('editMessageCaption', { chat_id: cp.chatId, message_id: cp.messageId, caption, parse_mode: 'HTML' })
      : await tg('editMessageText', { chat_id: cp.chatId, message_id: cp.messageId, text: caption, parse_mode: 'HTML', disable_web_page_preview: true });

  if (r.ok || notModified(r)) {
    return { ok: true, changed: true, channelPost: { ...cp, caption, imagesKey: cp.imagesKey ?? imagesKey(car) } };
  }
  // پیام در کانال پاک شده یا قابل ویرایش نیست → دوباره منتشر کن
  if (notFound(r) && !sold) return repost(car, settings, null);
  return { ok: false, error: r.description || 'ویرایش آگهی کانال ناموفق بود.' };
}
