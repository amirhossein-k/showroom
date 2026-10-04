import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Car, Customer, Partner, Transaction, Cheque } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { carFinancials, isSold } from '@/lib/calc';
import { loadOverview } from '@/lib/overview';
import { marketAnalysis, ownDealsFor, loadMarket } from '@/lib/market';
import { ALL_DOC_KEYS } from '@/lib/constants';
import { formatDate, formatNumber, priceShort, priceWords, toFa } from '@/lib/persian';
import { PageHeader, Section, Money, CarStatusBadge, Plate, StayMeter, Badge, CarTitle } from '@/components/ui';
import { Gallery, StatusPanel, ExpensesEditor, PartnersEditor, CommissionsEditor, DocsChecklist, CarLedger, InterestPanel } from '@/components/CarSections';
import MarketCompare from '@/components/MarketCompare';
import { DeleteButton } from '@/components/forms';
import Icon from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function CarDetailPage({ params }) {
  await connectDB();
  const [raw, settings, customersRaw, partnersRaw, txRaw, chequesRaw, allCarsRaw] = await Promise.all([
    Car.findById(params.id).lean(), getSettings(), Customer.find({}).sort({ createdAt: -1 }).lean(), Partner.find({}).lean(), Transaction.find({ car: params.id }).sort({ date: -1 }).lean(), Cheque.find({ car: params.id }).sort({ dueDate: 1 }).lean(), Car.find({}).lean(),
  ]);
  if (!raw) notFound();
  const car = plain(raw);
  const customers = plain(customersRaw);
  const partners = plain(partnersRaw);
  const transactions = plain(txRaw);
  const cheques = plain(chequesRaw);
  const fin = carFinancials(car, settings);
  const allCars = plain(allCarsRaw);
  const mk = loadMarket();
  const analysis = marketAnalysis(car, { ownDeals: ownDealsFor(car, allCars.filter(isSold)), settings, market: mk });
  const interested = customers.filter((c) => (c.interestedCars || []).some((x) => String(x) === String(car._id)));
  const key = `${car.brand} ${car.model}`.replace(/[\s‌]/g, '').toLowerCase();
  const matches = customers.filter((c) => !interested.some((x) => x._id === c._id) && c.status !== 'won' && ((c.wanted || '').replace(/[\s‌]/g, '').toLowerCase().includes(key) || (c.budgetMax && car.askingPrice <= c.budgetMax && (!c.budgetMin || car.askingPrice >= c.budgetMin))));
  const received = transactions.filter((t) => t.direction === 'in').reduce((a, t) => a + t.amount, 0);
  const paid = transactions.filter((t) => t.direction === 'out').reduce((a, t) => a + t.amount, 0);
  const purchaseTotal = car.ownership === 'consignment' ? car.ownerPrice || 0 : car.purchasePrice || 0;
  const settlement = {
    sale: car.salePrice ? { total: car.salePrice, received: received, remaining: Math.max(0, car.salePrice - received) } : null,
    purchase: purchaseTotal ? { total: purchaseTotal, paid, remaining: Math.max(0, purchaseTotal - paid) } : null,
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-mute">
        <Link href="/cars" className="inline-flex items-center gap-1 font-bold text-plate hover:underline">بازگشت به موجودی <span>←</span></Link>
        <div className="flex gap-2">
          <Link href={`/cars/${car._id}/edit`} className="btn-ghost"><Icon name="edit" size={17} /> ویرایش پرونده</Link>
          <DeleteButton url={`/api/cars/${car._id}`} redirect="/cars" label="حذف" confirmText="این پرونده و تراکنش‌های مرتبط حذف نمی‌شوند. از حذف خود خودرو مطمئنی؟" />
        </div>
      </div>
      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Gallery car={car} />
        <div className="flex flex-col justify-center">
          <div className="mb-2 flex flex-wrap gap-2"><CarStatusBadge status={car.status} /><Badge cls={car.ownership === 'consignment' ? 'bg-amberx-soft text-amberx' : 'bg-plate-soft text-plate'}>{car.ownership === 'consignment' ? 'امانی' : 'ملکی'}</Badge></div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{car.brand} {car.model}</h1>
          <div className="mt-1 text-ink-mute">مدل {toFa(car.year)} · {car.color} · {formatNumber(car.mileage)} کیلومتر</div>
          <div className="mt-4 flex flex-wrap items-center gap-4"><Plate plate={car.plate} size="lg" /> <span className="text-sm text-ink-mute">VIN: <b dir="ltr" className="font-mono text-ink-soft">{car.vin || '—'}</b></span></div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-paper p-3"><div className="text-sm text-ink-mute">{fin.sold ? 'قیمت فروش' : 'قیمت آگهی'}</div><Money value={fin.sold ? car.salePrice : car.askingPrice} words size="lg" /></div>
            <div className="rounded-2xl bg-paper p-3"><div className="text-sm text-ink-mute">قیمت تمام‌شده</div><Money value={fin.totalCost} words={false} size="lg" /></div>
            <div className="rounded-2xl bg-paper p-3"><div className="text-sm text-ink-mute">سود واقعی</div><Money value={fin.realProfit} tone="auto" words={false} size="lg" /></div>
          </div>
          {!fin.sold && <div className="mt-4"><StayMeter days={fin.days} threshold={settings.dormantDays} /></div>}
        </div>
      </div>

      <div className="mb-5"><Section title="وضعیت پرونده و فروش"><StatusPanel car={car} customers={customers} /></Section></div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="سود واقعی پرونده">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div><div className="mb-2 text-sm font-bold text-ink-mute">سرمایه و هزینه</div><div className="divide-y divide-line"><div className="flex justify-between py-2"><span>مبنای خرید / سهم مالک</span><b className="num">{priceShort(fin.base)}</b></div><div className="flex justify-between py-2"><span>هزینه‌های جانبی</span><b className="num">{priceShort(fin.expensesTotal)}</b></div><div className="flex justify-between py-2 font-extrabold"><span>قیمت تمام‌شده</span><b className="num">{priceShort(fin.totalCost)}</b></div></div></div>
            <div><div className="mb-2 text-sm font-bold text-ink-mute">سود و خواب سرمایه</div><div className="divide-y divide-line"><div className="flex justify-between py-2"><span>سود اسمی</span><b className={`num ${fin.nominalProfit < 0 ? 'text-alarm' : 'text-cash'}`}>{fin.nominalProfit === null ? '—' : priceShort(fin.nominalProfit)}</b></div><div className="flex justify-between py-2"><span>هزینه خواب سرمایه</span><b className="num text-alarm">{priceShort(fin.capitalCost)}</b></div><div className="flex justify-between py-2 font-extrabold"><span>سود واقعی</span><b className={`num ${fin.realProfit < 0 ? 'text-alarm' : 'text-cash'}`}>{fin.realProfit === null ? '—' : priceShort(fin.realProfit)}</b></div></div></div>
          </div>
          <div className="mt-4 rounded-xl bg-paper px-3 py-2 text-sm leading-6 text-ink-mute">محاسبه بر اساس {toFa(fin.days)} روز ماندگاری و نرخ هزینه فرصت ماهانه {toFa(fin.rate)}٪ انجام شده است. هزینه خواب: {priceWords(fin.capitalCost)}.</div>
        </Section>
        <Section title="هزینه‌های جانبی"><ExpensesEditor carId={car._id} expenses={car.expenses} /></Section>
        <Section title="شرکا و تقسیم سود"><PartnersEditor carId={car._id} partners={car.partners} allPartners={partners} split={fin.split} /></Section>
        <Section title="کمیسیون معامله"><CommissionsEditor carId={car._id} commissions={car.commissions} refPrice={fin.refPrice} /></Section>
        <Section title="قیمت بازار" className="xl:col-span-2"><MarketCompare car={car} analysis={analysis} /></Section>
        <Section title="مدارک و چک‌لیست انتقال سند"><DocsChecklist car={car} /></Section>
        <Section title="نقدینگی و تسویه"><CarLedger car={car} transactions={transactions} cheques={cheques} settlement={settlement} /></Section>
        <Section title="مشتری‌های علاقه‌مند" className="xl:col-span-2"><InterestPanel carId={car._id} interested={interested} matches={matches} /></Section>
      </div>
    </>
  );
}
