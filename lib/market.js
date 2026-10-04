import fs from 'fs';
import path from 'path';
import { normalizeFa } from './persian';

// فعلاً قیمت‌ها از فایل data/market-prices.json خوانده می‌شوند (داده‌های آزمایشی).
// بعداً کافی است یک کران‌جاب همین فایل یا یک کالکشن را از دیوار/باما به‌روز کند.
const FILE = path.join(process.cwd(), 'data', 'market-prices.json');
let cache = { mtime: 0, data: null };

export function loadMarket() {
  try {
    const stat = fs.statSync(FILE);
    if (!cache.data || stat.mtimeMs !== cache.mtime) {
      const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      const listings = (raw.listings || []).map((l) => ({ ...l, _key: normalizeFa(l.brand) + '|' + normalizeFa(l.model) }));
      cache = { mtime: stat.mtimeMs, data: { ...raw, listings } };
    }
    return cache.data;
  } catch (e) {
    return { updatedAt: null, listings: [], error: 'فایل data/market-prices.json پیدا نشد یا معتبر نیست.' };
  }
}

const AD_PREMIUM = 0.04; // آگهی‌ها معمولاً حدود ۴٪ بالاتر از معامله واقعی بسته می‌شوند
const round = (n, step = 1_000_000) => Math.round(n / step) * step;

export function quantile(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export const median = (arr) => quantile(arr, 0.5);

export function comparables(car, market = loadMarket()) {
  const key = normalizeFa(car.brand) + '|' + normalizeFa(car.model);
  const same = market.listings.filter((l) => l._key === key);
  let comps = same.filter((l) => Number(l.year) === Number(car.year));
  let widened = false;
  if (comps.length < 3) {
    comps = same.filter((l) => Math.abs(Number(l.year) - Number(car.year)) <= 1);
    widened = true;
  }
  return { comps, widened };
}

/**
 * تحلیل قیمت یک خودرو نسبت به بازار
 * ownDeals: معاملات واقعی ثبت‌شده در همین سیستم (فروش‌های قبلی همان مدل)
 */
export function marketAnalysis(car, { ownDeals = [], settings = {}, market } = {}) {
  const m = market || loadMarket();
  const { comps, widened } = comparables(car, m);
  const ads = comps.filter((c) => c.type !== 'deal');
  const fileDeals = comps.filter((c) => c.type === 'deal');
  const dealPrices = [...fileDeals.map((d) => d.price), ...ownDeals.map((d) => d.price)];
  const adPrices = ads.map((a) => a.price);

  const adMedian = median(adPrices);
  const dealMedian = median(dealPrices);
  if (!adMedian && !dealMedian) {
    return { available: false, count: 0, adsCount: 0, dealsCount: 0 };
  }

  let base = dealPrices.length >= 2 ? dealMedian : adMedian * (1 - AD_PREMIUM);
  const mileages = comps.map((c) => Number(c.mileage)).filter(Boolean);
  const avgMileage = mileages.length ? mileages.reduce((a, b) => a + b, 0) / mileages.length : null;
  let mileageAdj = 0;
  if (avgMileage && car.mileage) {
    mileageAdj = Math.max(-0.08, Math.min(0.08, -((car.mileage - avgMileage) / 10000) * 0.01));
    base = base * (1 + mileageAdj);
  }
  const suggested = { min: round(base * 0.97), target: round(base), max: round(base * 1.03) };

  const price = Number(car.askingPrice) || 0;
  const ref = adMedian || dealMedian;
  const diffPct = price && ref ? ((price - ref) / ref) * 100 : null;
  const threshold = Number(settings.overpriceThreshold ?? 7);
  let flag = null;
  if (diffPct !== null && diffPct > threshold) flag = 'over';
  else if (diffPct !== null && diffPct < -8) flag = 'under';

  return {
    available: true,
    widened,
    count: comps.length,
    adsCount: ads.length,
    dealsCount: dealPrices.length,
    adMedian: adMedian ? round(adMedian) : null,
    adP25: adPrices.length ? round(quantile(adPrices, 0.25)) : null,
    adP75: adPrices.length ? round(quantile(adPrices, 0.75)) : null,
    adMin: adPrices.length ? Math.min(...adPrices) : null,
    adMax: adPrices.length ? Math.max(...adPrices) : null,
    dealMedian: dealMedian ? round(dealMedian) : null,
    avgMileage: avgMileage ? Math.round(avgMileage) : null,
    mileageAdj: mileageAdj * 100,
    suggested,
    diffPct,
    flag,
    samples: [...comps].sort((a, b) => a.price - b.price).slice(0, 8),
  };
}

// فروش‌های واقعی ثبت‌شده در سیستم را به شکل معامله برای مقایسه برمی‌گرداند
export function ownDealsFor(car, soldCars) {
  const key = normalizeFa(car.brand) + '|' + normalizeFa(car.model);
  return soldCars
    .filter((s) => String(s._id) !== String(car._id))
    .filter((s) => normalizeFa(s.brand) + '|' + normalizeFa(s.model) === key && Math.abs((s.year || 0) - (car.year || 0)) <= 1 && s.salePrice)
    .map((s) => ({ price: s.salePrice, source: 'own', year: s.year, mileage: s.mileage }));
}
