import { toJalali, JALALI_MONTHS } from './jalali';

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

export function toFa(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[0-9]/g, (d) => FA[d]);
}

export function toEnDigits(v) {
  return String(v ?? '')
    .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
    .replace(/[٠-٩]/g, (d) => AR.indexOf(d));
}

export function parseNumber(v) {
  const s = toEnDigits(v).replace(/[^0-9.-]/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const v = Math.round(Number(n));
  const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return (v < 0 ? '−' : '') + toFa(s);
}

export function formatToman(n) {
  if (n === null || n === undefined) return '—';
  return `${formatNumber(n)} تومان`;
}

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد', 'میلیون میلیارد'];

function threeDigits(n) {
  const parts = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]);
  else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t) parts.push(TENS[t]);
    if (o) parts.push(ONES[o]);
  }
  return parts.join(' و ');
}

// تبدیل عدد به حروف فارسی: 1250000000 => «یک میلیارد و دویست و پنجاه میلیون»
export function numberToWords(input) {
  let n = Math.round(Math.abs(Number(input) || 0));
  if (n === 0) return 'صفر';
  const groups = [];
  let i = 0;
  while (n > 0 && i < SCALES.length) {
    const g = n % 1000;
    if (g) groups.unshift(`${threeDigits(g)}${SCALES[i] ? ' ' + SCALES[i] : ''}`);
    n = Math.floor(n / 1000);
    i += 1;
  }
  const words = groups.join(' و ');
  return Number(input) < 0 ? `منفی ${words}` : words;
}

export function priceWords(n) {
  if (!n) return '';
  return `${numberToWords(n)} تومان`;
}

// خلاصهٔ خوانا: ۱٫۲۵ میلیارد
export function priceShort(n) {
  if (n === null || n === undefined) return '—';
  const v = Number(n);
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  const fmt = (x) => toFa(Number(x.toFixed(2)).toString().replace('.', '٫'));
  if (a >= 1e9) return `${sign}${fmt(a / 1e9)} میلیارد`;
  if (a >= 1e6) return `${sign}${fmt(a / 1e6)} میلیون`;
  if (a >= 1e3) return `${sign}${fmt(a / 1e3)} هزار`;
  return sign + toFa(a);
}

export function formatDate(d) {
  if (!d) return '—';
  const { jy, jm, jd } = toJalali(d);
  return `${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
}

export function formatDateShort(d) {
  if (!d) return '—';
  const { jy, jm, jd } = toJalali(d);
  return toFa(`${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`);
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function daysBetween(a, b = new Date()) {
  if (!a) return 0;
  return Math.floor((startOfDay(b) - startOfDay(a)) / 86400000);
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function relativeDays(d) {
  const n = daysBetween(new Date(), d);
  if (n === 0) return 'امروز';
  if (n === 1) return 'فردا';
  if (n === -1) return 'دیروز';
  if (n > 0) return `${toFa(n)} روز دیگر`;
  return `${toFa(-n)} روز گذشته`;
}

export function normalizeFa(s) {
  return toEnDigits(s || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\s\-_]/g, '')
    .toLowerCase();
}
