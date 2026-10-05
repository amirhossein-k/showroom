import { connectDB, plain } from '@/lib/db';
import { Car } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { marketAnalysis, ownDealsFor } from '@/lib/market';
import { getMarket, MarketPrice } from '@/lib/marketPrices';
import { ACTIVE_STATUSES, SOLD_STATUSES } from '@/lib/constants';
import MarketClient from '@/components/MarketClient';

export const dynamic = 'force-dynamic';

// برند ← مدل‌ها برای پیشنهاد خودکار در فرم
function buildSuggestions(groups) {
  const map = {};
  for (const list of groups)
    for (const x of list) {
      const b = (x.brand || '').trim();
      const m = (x.model || '').trim();
      if (!b) continue;
      map[b] = map[b] || new Set();
      if (m) map[b].add(m);
    }
  return Object.fromEntries(Object.entries(map).map(([b, s]) => [b, [...s].sort((x, y) => x.localeCompare(y, 'fa'))]));
}

export default async function MarketPage() {
  await connectDB();
  const [raw, sold, settings, pricesRaw, m] = await Promise.all([
    Car.find({ status: { $in: ACTIVE_STATUSES } }).sort({ createdAt: -1 }).lean(),
    Car.find({ status: { $in: SOLD_STATUSES } }).lean(),
    getSettings(),
    MarketPrice.find({}).sort({ date: -1, createdAt: -1 }).limit(3000).lean(),
    getMarket(),
  ]);
  const cars = plain(raw);
  const soldCars = plain(sold);
  const prices = plain(pricesRaw);
  const suggestions = buildSuggestions([cars, soldCars, prices, m.listings || []]);

  return (
    <MarketClient
      cars={cars.map((c) => ({ ...c, mk: marketAnalysis(c, { ownDeals: ownDealsFor(c, soldCars), settings, market: m }) }))}
      prices={prices}
      suggestions={suggestions}
      marketUpdatedAt={m.updatedAt}
      meta={{ fileCount: m.fileCount, manualCount: m.manualCount, useSample: m.useSample, maxAgeDays: m.maxAgeDays }}
    />
  );
}
