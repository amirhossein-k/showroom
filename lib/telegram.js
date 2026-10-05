import { formatDate, priceShort, toFa, relativeDays, formatNumber } from './persian';
import { CHEQUE_STATUS } from './constants';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const apiBase = () => (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');

export async function sendTelegram(text, chatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId || process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN تنظیم نشده است.' };
  if (!chat) return { ok: false, error: 'شناسه چت صاحب نمایشگاه تنظیم نشده است.' };
  const chunks = [];
  let rest = text;
  while (rest.length > 3900) {
    const cut = rest.lastIndexOf('\n', 3900);
    chunks.push(rest.slice(0, cut > 0 ? cut : 3900));
    rest = rest.slice(cut > 0 ? cut : 3900);
  }
  chunks.push(rest);
  try {
    for (const part of chunks) {
      const res = await fetch(`${apiBase()}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: part, parse_mode: 'HTML', disable_web_page_preview: true }),
        cache: 'no-store',
      });
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.description || 'خطای تلگرام' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'ارتباط با سرور تلگرام برقرار نشد. اگر سرور داخل ایران است TELEGRAM_API_BASE را روی یک رله تنظیم کنید.' };
  }
}

const carName = (c) => (c ? `${c.brand} ${c.model} ${toFa(c.year || '')}` : '');

export function chequesText(o) {
  if (!o.cheques.length) return '✅ چکی در ۷ روز آینده نداری.';
  const lines = ['<b>📄 چک‌های ۷ روز آینده</b>'];
  for (const q of o.cheques) {
    const icon = q.level === 'overdue' ? '🔴' : q.level === 'near' ? '🟠' : '⚪️';
    const dir = q.direction === 'received' ? 'دریافتی از' : 'پرداختی به';
    lines.push(`${icon} ${priceShort(q.amount)} تومان · ${dir} ${esc(q.party)} · ${esc(q.bank || '')} · سررسید ${relativeDays(q.dueDate)}${q.level === 'overdue' ? ' ⚠️ خطر برگشت' : ''}`);
  }
  return lines.join('\n');
}

export function dormantText(o) {
  if (!o.dormant.length) return '✅ ماشین خواب‌مانده نداری.';
  const lines = [`<b>⏳ خواب سرمایه (بیش از ${toFa(o.settings.dormantDays)} روز)</b>`];
  for (const c of o.dormant) {
    lines.push(`• ${esc(carName(c))} · ${toFa(c.fin.days)} روز در پارکینگ · هزینه خواب ≈ ${priceShort(c.fin.capitalCost)} تومان`);
  }
  return lines.join('\n');
}

// [collections] هشدار مطالبات سررسیدگذشته، پیگیری‌ها، اعلام‌های تأییدنشده و چک‌ها
export function collectionAlertsText(alerts = [], limit = 10) {
  const important = alerts.filter((a) => a.level !== 'info');
  if (!important.length) return '';
  const icon = { overdue: '🔴', near: '🟠' };
  return ['<b>⏰ هشدار وصول و چک</b>']
    .concat(important.slice(0, limit).map((a) => `${icon[a.level] || '•'} ${toFa(esc(a.title))} · ${toFa(esc(a.sub))}${a.amount ? ' · ' + priceShort(a.amount) : ''}`))
    .concat(important.length > limit ? [`… و ${toFa(important.length - limit)} مورد دیگر`] : [])
    .join('\n');
}

export function digestText(o) {
  const s = o.stats;
  const parts = [
    `<b>🚗 گزارش روزانه ${esc(o.settings.showroomName)}</b>\n${formatDate(new Date())}`,
    `موجودی: ${toFa(s.activeCount)} خودرو (${toFa(s.ownedCount)} ملکی، ${toFa(s.consignCount)} امانی)\nارزش روز موجودی ملکی: ${priceShort(s.marketValue)} · بهای تمام‌شده: ${priceShort(s.ownedCost)}`,
    chequesText(o),
    dormantText(o),
  ];
  if (o.overpriced.length) {
    parts.push(
      ['<b>📈 قیمت بالاتر از میانه بازار</b>']
        .concat(o.overpriced.map((c) => `• ${esc(carName(c))}: ${priceShort(c.askingPrice)} (+${toFa(Math.round(c.mk.diffPct))}٪) · پیشنهاد: ${priceShort(c.mk.suggested.min)} تا ${priceShort(c.mk.suggested.max)}`))
        .join('\n')
    );
  }
  if (o.followToday.length || o.cooling.length) {
    const lines = ['<b>📞 پیگیری مشتری</b>'];
    o.followToday.forEach((c) => lines.push(`• امروز: ${esc(c.name)} ${esc(c.phone || '')}${c.wanted ? ' · ' + esc(c.wanted) : ''}`));
    o.cooling.slice(0, 6).forEach((c) => lines.push(`• در حال سرد شدن (${toFa(c.silentDays)} روز بی‌خبر): ${esc(c.name)} ${esc(c.phone || '')}`));
    parts.push(lines.join('\n'));
  }
  if (o.receivables.length) {
    parts.push(
      [`<b>💰 مطالبات وصول‌نشده: ${priceShort(s.receivableTotal)} تومان</b>`]
        .concat(o.receivables.slice(0, 6).map((c) => `• ${esc(carName(c))} · ${esc(c.buyerName || '')} · مانده ${priceShort(c.remaining)}`))
        .join('\n')
    );
  }
  if (o.transferPending.length) {
    parts.push(
      ['<b>📑 منتظر انتقال سند</b>']
        .concat(o.transferPending.map((c) => `• ${esc(carName(c))} · ${c.missing.length ? 'مانده: ' + c.missing.slice(0, 4).map(esc).join('، ') : 'مدارک کامل'}`))
        .join('\n')
    );
  }
  return parts.join('\n\n');
}
