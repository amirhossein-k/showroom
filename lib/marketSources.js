// منابع قیمت بازار — بدون وابستگی سمت سرور تا در کلاینت هم قابل استفاده باشد
export const MARKET_SOURCES = {
  colleague: 'نمایشگاه همکار',
  divar: 'دیوار',
  bama: 'باما',
  instagram: 'اینستاگرام',
  telegram: 'تلگرام',
  website: 'سایت',
  phone: 'تماس تلفنی',
  other: 'سایر',
};

export const PRICE_TYPES = {
  ad: 'آگهی / پیشنهادی',
  deal: 'معامله قطعی',
};

// مدت‌زمانی که بعد از آن یک قیمت «قدیمی» حساب می‌شود (فقط برای نمایش)
export const STALE_DAYS = 30;

export function sourceLabel(source) {
  return MARKET_SOURCES[source] || (source === 'deal' ? 'معامله' : 'سایر');
}

// برچسب منبع برای نمونه‌های مقایسه (هم دادهٔ فایل و هم ورودی دستی)
export function sampleSourceLabel(x = {}) {
  if (x.manual) return x.sourceName || sourceLabel(x.source);
  if (x.source === 'deal' || x.type === 'deal') return 'معامله';
  if (x.source === 'divar') return 'دیوار';
  if (x.source === 'bama') return 'باما';
  return sourceLabel(x.source);
}
