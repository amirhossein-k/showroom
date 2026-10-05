// استعلام خلافی و توقیف خودرو
// هیچ API رایگان/عمومی رسمی برای این استعلام‌ها نیست؛ باید از یک ارائه‌دهنده مجاز (مثلاً فینوتک، جیبیت، یا سرویس‌های مشابه)
// قرارداد بگیری. این فایل یک «آداپتر عمومی» است: آدرس و توکن سرویس را در env می‌گذاری و فقط تابع mapResponse را
// با فرمت خروجی ارائه‌دهنده‌ات تطبیق می‌دهی. بدون تنظیمات، فقط «ثبت دستی نتیجه» فعال است.
//
// env:
//   INQUIRY_FINES_URL     آدرس POST استعلام خلافی
//   INQUIRY_SEIZURE_URL   آدرس POST استعلام توقیف
//   INQUIRY_TOKEN         توکن Bearer
//   INQUIRY_PROVIDER      نام ارائه‌دهنده (فقط برای نمایش/ثبت)

const env = (k) => (process.env[k] || '').trim();
const URLS = { fines: () => env('INQUIRY_FINES_URL'), seizure: () => env('INQUIRY_SEIZURE_URL') };

export const inquiryEnabled = (kind) => !!(URLS[kind]?.() && env('INQUIRY_TOKEN'));

const plateStr = (p = {}) => [p.p1, p.letter, p.p2, p.region].filter(Boolean).join('');

// ⚠️ این را با مستندات ارائه‌دهنده‌ات هماهنگ کن
function buildRequest(kind, { car, contract }) {
  return {
    plate: plateStr(car.plate),
    plateParts: car.plate,
    vin: car.vin,
    cardNo: contract.carDocs?.cardNo,
    nationalId: contract.seller?.nationalId,
    mobile: contract.seller?.phone,
  };
}

// خروجی یکدست: { ok, amount?, seized?, summary, raw }
function mapResponse(kind, json) {
  const r = json?.result ?? json?.data ?? json;
  if (kind === 'fines') {
    const amount = Number(r?.totalAmount ?? r?.amount ?? r?.sum ?? 0) || 0;
    return { ok: true, amount, summary: amount ? `${amount.toLocaleString('fa-IR')} ریال خلافی` : 'بدون خلافی', raw: json };
  }
  const seized = !!(r?.seized ?? r?.isSeized ?? r?.hasRestriction ?? false);
  return { ok: true, seized, summary: seized ? 'خودرو توقیف/ممنوع‌المعامله است' : 'منع معامله/توقیف ندارد', raw: json };
}

export async function runInquiry(kind, ctx) {
  if (!inquiryEnabled(kind)) throw new Error('سرویس استعلام آنلاین تنظیم نشده؛ نتیجه را دستی ثبت کن.');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(URLS[kind](), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('INQUIRY_TOKEN')}` },
      body: JSON.stringify(buildRequest(kind, ctx)),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || `خطای سرویس استعلام (${res.status})`);
    return { ...mapResponse(kind, json), provider: env('INQUIRY_PROVIDER') || 'api' };
  } finally {
    clearTimeout(t);
  }
}
