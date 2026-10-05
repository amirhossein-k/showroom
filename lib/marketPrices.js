import mongoose, { Schema } from 'mongoose';
import { connectDB } from './db';
import { loadMarket } from './market';
import { normalizeFa, toEnDigits, parseNumber } from './persian';
import { MARKET_SOURCES, PRICE_TYPES } from './marketSources';

// ───────── قیمت‌های دستی بازار ─────────
// قیمت‌هایی که از نمایشگاه‌های همکار، دیوار/باما، اینستاگرام، تلگرام و… به‌دست می‌آید
// و کاربر دستی ثبت می‌کند. در تحلیل قیمت، کنار دادهٔ فایل data/market-prices.json قرار می‌گیرند.
const marketPriceSchema = new Schema(
  {
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    trim: { type: String, trim: true },
    year: { type: Number, required: true, min: 1300, max: 2100 },
    mileage: { type: Number, default: 0, min: 0 },
    color: { type: String, trim: true },
    price: { type: Number, required: true, min: 1_000_000 },
    type: { type: String, enum: Object.keys(PRICE_TYPES), default: 'ad' },
    source: { type: String, enum: Object.keys(MARKET_SOURCES), default: 'other' },
    sourceName: { type: String, trim: true }, // نام نمایشگاه، پیج یا سایت
    link: { type: String, trim: true },
    city: { type: String, trim: true },
    date: { type: Date, default: Date.now }, // تاریخ مشاهدهٔ قیمت
    note: { type: String, trim: true },
    active: { type: Boolean, default: true }, // در محاسبه شرکت کند؟
  },
  { timestamps: true }
);
marketPriceSchema.index({ brand: 1, model: 1, year: 1 });
marketPriceSchema.index({ date: -1 });

export const MarketPrice = mongoose.models.MarketPrice || mongoose.model('MarketPrice', marketPriceSchema);

const FIELDS = ['brand', 'model', 'trim', 'year', 'mileage', 'color', 'price', 'type', 'source', 'sourceName', 'link', 'city', 'date', 'note', 'active'];
const NUMERIC = ['year', 'mileage', 'price'];
const str = (v) => toEnDigits(String(v ?? '')).replace(/\s+/g, ' ').trim();

/** پاک‌سازی و اعتبارسنجی ورودی کاربر. partial=true برای PATCH */
export function sanitizeMarketPrice(input = {}, { partial = false } = {}) {
  const out = {};
  for (const k of FIELDS) {
    if (!(k in input)) continue;
    const v = input[k];
    if (NUMERIC.includes(k)) out[k] = typeof v === 'number' ? v : parseNumber(v);
    else if (k === 'active') out[k] = v !== false && v !== 'false';
    else if (k === 'date') out[k] = v ? new Date(v) : new Date();
    else out[k] = k === 'brand' || k === 'model' ? str(v) : String(v ?? '').trim();
  }
  if (out.date && Number.isNaN(out.date.getTime())) delete out.date;
  if (out.type && !PRICE_TYPES[out.type]) out.type = 'ad';
  if (out.source && !MARKET_SOURCES[out.source]) out.source = 'other';
  if (out.link && !/^https?:\/\//i.test(out.link)) out.link = 'https://' + out.link;

  const errors = [];
  if (!partial || 'brand' in out) if (!out.brand) errors.push('برند');
  if (!partial || 'model' in out) if (!out.model) errors.push('مدل');
  if (!partial || 'year' in out) if (!out.year || out.year < 1300 || out.year > 2100) errors.push('سال ساخت');
  if (!partial || 'price' in out) if (!out.price || out.price < 1_000_000) errors.push('قیمت (حداقل یک میلیون تومان)');
  if (errors.length) throw Object.assign(new Error('این موارد را درست وارد کن: ' + errors.join('، ')), { status: 400 });
  return out;
}

const MAX_AGE_DAYS = Number(process.env.MARKET_MAX_AGE_DAYS || 90);
const USE_SAMPLE = process.env.MARKET_USE_SAMPLE !== '0';

/**
 * دادهٔ بازار = فایل پروژه (در صورت فعال بودن) + قیمت‌های دستی فعال و تازه
 * خروجی همان شکل loadMarket() را دارد تا marketAnalysis بدون تغییر کار کند.
 */
export async function getMarket() {
  const file = USE_SAMPLE ? loadMarket() : { updatedAt: null, listings: [] };
  let manual = [];
  try {
    await connectDB();
    const since = new Date(Date.now() - MAX_AGE_DAYS * 86400000);
    manual = await MarketPrice.find({ active: true, date: { $gte: since } }).lean();
  } catch (e) {
    console.error('[market] خواندن قیمت‌های دستی ناموفق بود', e);
  }
  const manualListings = manual.map((m) => ({
    _id: String(m._id),
    manual: true,
    brand: m.brand,
    model: m.model,
    year: m.year,
    mileage: m.mileage,
    color: m.color,
    price: m.price,
    type: m.type,
    source: m.source,
    sourceName: m.sourceName,
    city: m.city,
    date: m.date ? new Date(m.date).toISOString() : null,
    _key: normalizeFa(m.brand) + '|' + normalizeFa(m.model),
  }));
  const lastManual = manual.reduce((a, m) => Math.max(a, new Date(m.updatedAt || m.date || 0).getTime()), 0);
  const fileTime = file.updatedAt ? new Date(file.updatedAt).getTime() : 0;
  const latest = Math.max(lastManual, fileTime);
  return {
    ...file,
    listings: [...(file.listings || []), ...manualListings],
    fileCount: (file.listings || []).length,
    manualCount: manualListings.length,
    useSample: USE_SAMPLE,
    maxAgeDays: MAX_AGE_DAYS,
    updatedAt: latest ? new Date(latest).toISOString() : null,
  };
}
