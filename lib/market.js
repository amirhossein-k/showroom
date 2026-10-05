import { normalizeFa, toEnDigits } from './persian';

// دادهٔ بازار فقط از صفحهٔ «قیمت بازار» (getMarket در lib/marketPrices.js) می‌آید.
// فایل data/market-prices.json دیگر خوانده نمی‌شود. loadMarket فقط برای سازگاری با کدهای قدیمی مانده
// و یک بازار خالی برمی‌گرداند تا هیچ دادهٔ پیش‌فرضی نمایش داده نشود.
const EMPTY_MARKET = { updatedAt: null, listings: [] };
export function loadMarket() {
  return EMPTY_MARKET;
}

const AD_PREMIUM = 0.04; // آگهی‌ها معمولاً حدود ۴٪ بالاتر از معامله واقعی بسته می‌شوند
const MAX_SAMPLES = 30;
const round = (n, step = 1_000_000) => Math.round(n / step) * step;
// تیپ را به مجموعه‌ای از کلمات تبدیل می‌کند تا جداکننده و ترتیب مهم نباشد:
// «تیپ 5 و اتومات» = «تیپ۵ / اتوماتیک» = «اتومات، تیپ ۵»
export function trimTokens(t) {
  const s = toEnDigits(t || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, '')
    .toLowerCase()
    .replace(/تیپ|type|tip/g, ' ')
    .replace(/اتوماتیک|automatic|auto/g, 'اتومات')
    .replace(/دنده\s*ای|منوال|manual/g, 'دستی')
    .replace(/([0-9]+)/g, ' $1 ');
  return [...new Set(s.split(/[\s\/\\,،|+\-_()]+|\sو\s/).map((w) => w.trim()).filter((w) => w && w !== 'و'))].sort();
}
export const sameTrim = (a, b) => {
  const x = trimTokens(a);
  const y = trimTokens(b);
  return x.length > 0 && x.length === y.length && x.every((w, i) => w === y[i]);
};

const keyOf = (x) => normalizeFa(x.brand) + '|' + normalizeFa(x.model);

export function quantile(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export const median = (arr) => quantile(arr, 0.5);

// تطبیق: برند + مدل (اجباری)، سال (اگر خودرو سال داشته باشد)، و تیپ (اگر هر دو طرف تیپ داشته باشند و نمونهٔ کافی باشد)
export function comparables(car, market = EMPTY_MARKET) {
  const key = keyOf(car);
  const same = (market.listings || []).filter((l) => (l._key || keyOf(l)) === key);
  const carYear = Number(car.year) || 0;

  let comps;
  let widened = false;
  if (!carYear) {
    // خودرو بدون سال ساخت ثبت شده: همهٔ سال‌های همان برند/مدل
    comps = same;
    widened = same.length > 0;
  } else {
    comps = same.filter((l) => Number(l.year) === carYear);
    if (comps.length < 3) {
      comps = same.filter((l) => Math.abs(Number(l.year) - carYear) <= 1);
      widened = comps.some((l) => Number(l.year) !== carYear);
    }
  }

  // اگر تیپ خودرو مشخص است و حداقل ۲ نمونه با همان تیپ داریم، فقط همان‌ها
  let trimMatched = false;
  if (trimTokens(car.trim).length) {
    const matched = comps.filter((l) => sameTrim(l.trim, car.trim));
    if (matched.length >= 2) {
      comps = matched;
      trimMatched = true;
    }
  }
  return { comps, widened, trimMatched };
}

/**
 * تحلیل قیمت یک خودرو نسبت به قیمت‌های ثبت‌شده در «قیمت بازار»
 * ownDeals: معاملات واقعی ثبت‌شده در همین سیستم (فروش‌های قبلی همان مدل)
 */
export function marketAnalysis(car, { ownDeals = [], settings = {}, market } = {}) {
  const m = market || EMPTY_MARKET;
  const { comps, widened, trimMatched } = comparables(car, m);
  const ads = comps.filter((c) => c.type !== 'deal');
  const listedDeals = comps.filter((c) => c.type === 'deal');
  const dealPrices = [...listedDeals.map((d) => d.price), ...ownDeals.map((d) => d.price)];
  const adPrices = ads.map((a) => a.price);

  const adMedian = median(adPrices);
  const dealMedian = median(dealPrices);
  if (!adMedian && !dealMedian) {
    return { available: false, count: 0, adsCount: 0, dealsCount: 0, samples: [] };
  }

  let base = dealPrices.length >= 2 ? dealMedian : adMedian ? adMedian * (1 - AD_PREMIUM) : dealMedian;
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

  // همهٔ نمونه‌ها (جدیدترین اول) تا هر قیمتی که ثبت شده دیده شود
  const samples = [...comps]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, MAX_SAMPLES);

  return {
    available: true,
    widened,
    trimMatched,
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
    samples,
  };
}

// فروش‌های واقعی ثبت‌شده در سیستم را به شکل معامله برای مقایسه برمی‌گرداند
export function ownDealsFor(car, soldCars) {
  const key = keyOf(car);
  return soldCars
    .filter((s) => String(s._id) !== String(car._id))
    .filter((s) => keyOf(s) === key && Math.abs((s.year || 0) - (car.year || 0)) <= 1 && s.salePrice)
    .map((s) => ({ price: s.salePrice, source: 'own', year: s.year, mileage: s.mileage }));
}
