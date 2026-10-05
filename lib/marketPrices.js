import mongoose, { Schema } from 'mongoose';
import { connectDB } from './db';
import { normalizeFa, toEnDigits, parseNumber } from './persian';
import { MARKET_SOURCES, PRICE_TYPES } from './marketSources';

// ───────── قیمت‌های بازار ─────────
// تنها منبع دادهٔ بازار: قیمت‌هایی که در صفحهٔ «قیمت بازار» ثبت شده‌اند (MongoDB).
// فایل data/market-prices.json دیگر خوانده نمی‌شود.
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
    sourceName: { type: String, trim: true },
    link: { type: String, trim: true },
    city: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true },
    active: { type: Boolean, default: true },
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

// پیش‌فرض: بدون محدودیت سنی. اگر خواستی قیمت‌های قدیمی از محاسبه حذف شوند، MARKET_MAX_AGE_DAYS را در .env.local بگذار.
const MAX_AGE_DAYS = Number(process.env.MARKET_MAX_AGE_DAYS || 0);

/**
 * دادهٔ بازار = فقط قیمت‌های فعال ثبت‌شده در صفحهٔ «قیمت بازار».
 * خروجی همان شکل قبلی را دارد تا marketAnalysis و صفحه‌ها بدون تغییر کار کنند.
 */
export async function getMarket() {
  let manual = [];
  try {
    await connectDB();
    const q = { active: { $ne: false } };
    if (MAX_AGE_DAYS > 0) q.date = { $gte: new Date(Date.now() - MAX_AGE_DAYS * 86400000) };
    manual = await MarketPrice.find(q).sort({ date: -1, createdAt: -1 }).lean();
  } catch (e) {
    console.error('[market] خواندن قیمت‌های بازار ناموفق بود', e);
  }
  const listings = manual.map((m) => ({
    _id: String(m._id),
    manual: true,
    brand: m.brand,
    model: m.model,
    trim: m.trim,
    year: Number(m.year),
    mileage: m.mileage,
    color: m.color,
    price: m.price,
    type: m.type,
    source: m.source,
    sourceName: m.sourceName,
    link: m.link,
    city: m.city,
    date: m.date ? new Date(m.date).toISOString() : null,
    _key: normalizeFa(m.brand) + '|' + normalizeFa(m.model),
  }));
  const latest = manual.reduce((a, m) => Math.max(a, new Date(m.updatedAt || m.date || 0).getTime()), 0);
  return {
    listings,
    fileCount: 0,
    manualCount: listings.length,
    useSample: false,
    maxAgeDays: MAX_AGE_DAYS,
    updatedAt: latest ? new Date(latest).toISOString() : null,
  };
}
