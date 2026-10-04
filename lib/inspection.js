import { toFa } from './persian';

// قطعات بدنه (نمای بالا، جلوی ماشین بالای تصویر)
export const BODY_PARTS = [
  { key: 'frontBumper', label: 'سپر جلو', x: 40, y: 8, w: 140, h: 22, rx: 10 },
  { key: 'hood', label: 'کاپوت', x: 48, y: 34, w: 124, h: 82, rx: 8 },
  { key: 'fenderFL', label: 'گلگیر جلو چپ', x: 12, y: 34, w: 32, h: 82, rx: 8 },
  { key: 'fenderFR', label: 'گلگیر جلو راست', x: 176, y: 34, w: 32, h: 82, rx: 8 },
  { key: 'doorFL', label: 'درب جلو چپ', x: 12, y: 124, w: 32, h: 86, rx: 6 },
  { key: 'doorRL', label: 'درب عقب چپ', x: 12, y: 214, w: 32, h: 86, rx: 6 },
  { key: 'doorFR', label: 'درب جلو راست', x: 176, y: 124, w: 32, h: 86, rx: 6 },
  { key: 'doorRR', label: 'درب عقب راست', x: 176, y: 214, w: 32, h: 86, rx: 6 },
  { key: 'roof', label: 'سقف', x: 56, y: 160, w: 108, h: 110, rx: 10 },
  { key: 'fenderRL', label: 'گلگیر عقب چپ', x: 12, y: 304, w: 32, h: 82, rx: 8 },
  { key: 'fenderRR', label: 'گلگیر عقب راست', x: 176, y: 304, w: 32, h: 82, rx: 8 },
  { key: 'trunk', label: 'درب صندوق', x: 48, y: 316, w: 124, h: 70, rx: 8 },
  { key: 'rearBumper', label: 'سپر عقب', x: 40, y: 392, w: 140, h: 22, rx: 10 },
];

// قطعات ساختاری که در نقشه نیستند ولی برای خریدار ایرانی حیاتی‌اند
export const STRUCT_PARTS = [
  { key: 'pillars', label: 'ستون‌ها' },
  { key: 'chassisFront', label: 'شاسی جلو' },
  { key: 'chassisRear', label: 'شاسی عقب' },
  { key: 'floor', label: 'کف/سینی' },
  { key: 'firewall', label: 'دیواره آتش' },
];

export const BODY_STATES = {
  ok: { label: 'سالم', color: '#22c55e' },
  spot: { label: 'لکه رنگ', color: '#facc15' },
  painted: { label: 'رنگ‌شده', color: '#f97316' },
  dent: { label: 'صافکاری بی‌رنگ', color: '#38bdf8' },
  replaced: { label: 'تعویضی', color: '#ef4444' },
  damaged: { label: 'آسیب/تصادفی', color: '#7f1d1d' },
};

export const TECH_ITEMS = [
  { key: 'engine', label: 'موتور' },
  { key: 'gearbox', label: 'گیربکس' },
  { key: 'suspension', label: 'جلوبندی و تعلیق' },
  { key: 'brakes', label: 'ترمز' },
  { key: 'electrical', label: 'برق و سیم‌کشی' },
  { key: 'ac', label: 'کولر و بخاری' },
  { key: 'airbags', label: 'ایربگ' },
  { key: 'interior', label: 'داخل کابین' },
];

export const TECH_STATES = {
  ok: { label: 'سالم', color: '#22c55e' },
  service: { label: 'نیاز به سرویس', color: '#facc15' },
  repair: { label: 'نیاز به تعمیر', color: '#ef4444' },
};

const ALL_BODY = [...BODY_PARTS, ...STRUCT_PARTS];

// خلاصه قابل‌خواندن، مثل «۲ لکه رنگ، ۱ تعویضی (کاپوت)»
export function bodySummary(inspection) {
  const body = inspection?.body || {};
  const entries = Object.entries(body).filter(([, s]) => s && s !== 'ok');
  if (!Object.keys(body).length) return 'کارشناسی ثبت نشده';
  if (!entries.length) return 'بدون رنگ و تعویض ✅';
  const groups = {};
  for (const [k, s] of entries) (groups[s] = groups[s] || []).push(ALL_BODY.find((p) => p.key === k)?.label || k);
  return Object.entries(groups)
    .map(([s, parts]) => `${toFa(parts.length)} ${BODY_STATES[s]?.label || s} (${parts.join('، ')})`)
    .join(' · ');
}

export function hasStructuralDamage(inspection) {
  const body = inspection?.body || {};
  return STRUCT_PARTS.some((p) => body[p.key] && body[p.key] !== 'ok');
}
