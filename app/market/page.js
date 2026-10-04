import { connectDB, plain } from '@/lib/db';
import { Car } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { marketAnalysis, ownDealsFor, loadMarket } from '@/lib/market';
import { ACTIVE_STATUSES, SOLD_STATUSES } from '@/lib/constants';
import MarketClient from '@/components/MarketClient';
export const dynamic = 'force-dynamic';
export default async function MarketPage() { await connectDB(); const [raw, sold, settings] = await Promise.all([Car.find({ status: { $in: ACTIVE_STATUSES } }).sort({ createdAt: -1 }).lean(), Car.find({ status: { $in: SOLD_STATUSES } }).lean(), getSettings()]); const cars = plain(raw); const soldCars = plain(sold); const m = loadMarket(); return <MarketClient cars={cars.map((c) => ({ ...c, mk: marketAnalysis(c, { ownDeals: ownDealsFor(c, soldCars), settings, market: m }) }))} marketUpdatedAt={m.updatedAt} />; }
