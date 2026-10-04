import crypto from 'crypto';

const sig = (id) =>
  crypto.createHmac('sha256', process.env.AUTH_SALT || process.env.TELEGRAM_BOT_TOKEN || 'autodar').update(String(id)).digest('hex').slice(0, 10);

// پارامتر start تلگرام: فقط A-Z a-z 0-9 _ - و حداکثر ۶۴ کاراکتر
export const customerStartParam = (id) => `c_${id}_${sig(id)}`;

export function parseCustomerStartParam(param) {
  const m = /^c_([a-f0-9]{24})_([a-f0-9]{10})$/.exec(param || '');
  if (!m) return null;
  return sig(m[1]) === m[2] ? m[1] : null;
}

export function customerDeepLink(id) {
  const bot = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  if (!bot) return null;
  return `https://t.me/${bot}?start=${customerStartParam(id)}`;
}
