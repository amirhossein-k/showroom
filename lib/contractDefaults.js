import { toEnDigits } from './persian';

export const DEFAULT_TERMS = [
  'خریدار خودرو را رؤیت، تست و کارشناسی کرده و از وضعیت ظاهری و فنی آن آگاه است.',
  'فروشنده متعهد است خودرو را عاری از هرگونه توقیف، رهن و منع قانونی به خریدار تحویل دهد.',
  'هزینه خلافی تا تاریخ تحویل بر عهده فروشنده و پس از آن بر عهده خریدار است.',
  'طرفین متعهدند در تاریخ تعیین‌شده برای انتقال سند در دفترخانه/مرکز تعویض پلاک حاضر شوند.',
  'در صورت برگشت هر یک از چک‌ها، کل مانده ثمن معامله حال شده و فروشنده حق فسخ دارد.',
  'در صورت تأخیر هر یک از طرفین در انجام تعهدات، روزانه مبلغ وجه التزام مندرج پرداخت خواهد شد.',
  'این قرارداد در دو نسخه با اعتبار یکسان تنظیم و به امضای طرفین و شهود رسید.',
];

export const PAYMENT_KINDS = { cash: 'نقد', transfer: 'کارت‌به‌کارت/حواله', cheque: 'چک' };

export const CONTRACT_STATUS = {
  draft: { label: 'پیش‌نویس', cls: 'bg-amberx-soft text-amberx' },
  signed: { label: 'امضاشده', cls: 'bg-cash-soft text-cash' },
  cancelled: { label: 'لغوشده', cls: 'bg-alarm-soft text-alarm' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'در انتظار', cls: 'bg-amberx-soft text-amberx' },
  paid: { label: 'پرداخت شد', cls: 'bg-cash-soft text-cash' },
  bounced: { label: 'برگشتی', cls: 'bg-alarm text-white' },
};

// وضعیت چک دفتر چک  <->  وضعیت قسط قرارداد
export const CHEQUE_TO_PAYMENT = { pending: 'pending', cleared: 'paid', bounced: 'bounced', cancelled: 'pending' };
export const PAYMENT_TO_CHEQUE = { pending: 'pending', paid: 'cleared', bounced: 'bounced' };

export const HISTORY_LABELS = {
  created: 'ایجاد پیش‌نویس',
  edited: 'ویرایش',
  signed: 'امضا و نهایی شد',
  cancelled: 'لغو شد',
  delivered: 'خودرو تحویل شد',
  transferred: 'سند منتقل شد',
  payment: 'تغییر وضعیت پرداخت',
};

export function paymentStatus(p) {
  return p?.status || (p?.paid ? 'paid' : 'pending');
}

/** اعتبارسنجی کد ملی ایران (الگوریتم رقم کنترل) */
export function isValidNationalId(v) {
  const s = toEnDigits(v || '').trim();
  if (!/^\d{10}$/.test(s)) return false;
  if (/^(\d)\1{9}$/.test(s)) return false;
  const check = Number(s[9]);
  const sum = s.slice(0, 9).split('').reduce((a, d, i) => a + Number(d) * (10 - i), 0) % 11;
  return sum < 2 ? check === sum : check === 11 - sum;
}

export function isValidMobile(v) {
  return /^09\d{9}$/.test(toEnDigits(v || '').trim());
}

/** خلاصه مالی قرارداد برای UI */
export function contractSummary(c, now = new Date()) {
  const ps = c.payments || [];
  const paid = ps.filter((p) => paymentStatus(p) === 'paid').reduce((a, p) => a + p.amount, 0);
  const bounced = ps.filter((p) => paymentStatus(p) === 'bounced');
  const overdue = ps.filter((p) => paymentStatus(p) === 'pending' && p.dueDate && new Date(p.dueDate) < now);
  const day = 86400000;
  const lateDays = (due, done) => (due && !done ? Math.max(0, Math.floor((now - new Date(due)) / day)) : 0);
  const deliveryLate = c.status === 'signed' ? lateDays(c.deliveryDate, c.deliveredAt) : 0;
  const transferLate = c.status === 'signed' ? lateDays(c.transferDate, c.transferredAt) : 0;
  return {
    total: c.totalPrice,
    paid,
    remaining: c.totalPrice - paid,
    bouncedCount: bounced.length,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((a, p) => a + p.amount, 0),
    deliveryLate,
    transferLate,
    penaltyAccrued: (deliveryLate + transferLate) * (c.penaltyPerDay || 0),
  };
}
