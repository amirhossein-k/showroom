import Link from 'next/link';
import { Suspense } from 'react';
import { connectDB, plain } from '@/lib/db';
import { Car } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { carFinancials, isSold } from '@/lib/calc';
import { marketAnalysis, ownDealsFor } from '@/lib/market';
import { getMarket } from '@/lib/marketPrices';
import { ACTIVE_STATUSES } from '@/lib/constants';
import { toFa, priceShort } from '@/lib/persian';
import { PageHeader, Empty } from '@/components/ui';
import CarCard from '@/components/CarCard';
import CarFilters from '@/components/CarFilters';
import Icon from '@/components/Icon';

export const dynamic = 'force-dynamic';
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async function CarsPage({ searchParams: sp }) {
  await connectDB();
  const settings = await getSettings();
  const q = {};
  const status = sp.status || 'active';
  if (status === 'active') q.status = { $in: ACTIVE_STATUSES };
  else if (status !== 'all') q.status = status;
  if (sp.brand) q.brand = sp.brand;
  if (sp.color) q.color = sp.color;
  if (sp.ownership) q.ownership = sp.ownership;
  if (sp.maxKm) q.mileage = { $lte: Number(sp.maxKm) };
  if (sp.price) {
    const [a, b] = sp.price.split('-');
    q.askingPrice = {};
    if (a) q.askingPrice.$gte = Number(a) * 1e6;
    if (b) q.askingPrice.$lte = Number(b) * 1e6;
  }
  if (sp.q) {
    const r = new RegExp(escRe(sp.q), 'i');
    q.$or = [{ brand: r }, { model: r }, { vin: r }, { 'plate.p2': r }, { 'plate.p1': r }, { color: r }];
  }
  const sorts = { newest: { createdAt: -1 }, stale: { purchaseDate: 1 }, price: { askingPrice: 1 }, priceDesc: { askingPrice: -1 }, km: { mileage: 1 } };
  const [rawCars, brands, colors, soldRaw] = await Promise.all([
    Car.find(q).sort(sorts[sp.sort] || sorts.newest).lean(),
    Car.distinct('brand'),
    Car.distinct('color'),
    Car.find({ status: { $in: ['sold', 'awaiting_transfer'] } }, 'brand model year mileage salePrice status').lean(),
  ]);
  const market = await getMarket();
  const sold = plain(soldRaw).filter(isSold);
  const cars = plain(rawCars).map((c) => ({
    ...c,
    fin: carFinancials(c, settings),
    mk: ACTIVE_STATUSES.includes(c.status) ? marketAnalysis(c, { ownDeals: ownDealsFor(c, sold), settings, market }) : null,
  }));
  const total = cars.reduce((a, c) => a + (c.askingPrice || 0), 0);

  return (
    <>
      <PageHeader title="موجودی خودرو" subtitle={`${toFa(cars.length)} خودرو · ارزش آگهی ${priceShort(total)} تومان`}>
        <Link href="/cars/new" className="btn-primary">
          <Icon name="plus" /> ثبت خودرو
        </Link>
      </PageHeader>
      <Suspense>
        <CarFilters brands={brands} colors={colors} />
      </Suspense>
      {cars.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {cars.map((c) => (
            <CarCard key={c._id} car={c} settings={settings} />
          ))}
        </div>
      ) : (
        <Empty>خودرویی با این فیلترها پیدا نشد.</Empty>
      )}
    </>
  );
}
