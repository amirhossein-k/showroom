'use client';
import Link from 'next/link';
import { priceShort, priceWords, toFa } from '@/lib/persian';
import { PageHeader, Section, CarTitle, Empty } from './ui';
import { Toggle } from './inputs';
import Icon from './Icon';

export default function ReportsClient({ data, period, onPeriod }) {
  const s = data.stats;
  const sold = data.cars.filter((c) => c.fin.sold);
  const risky = data.cars.filter((c) => (c.fin.realProfit !== null && c.fin.realProfit < 0) || c.fin.days >= data.settings.dormantDays)
    .sort((a, b) => (a.fin.realProfit || 0) - (b.fin.realProfit || 0)).slice(0, 8);
  return <>
    <PageHeader title="گزارش سود و سرمایه" subtitle={`${period.label} · اینجا اختلاف خرید و فروش را با سود واقعی اشتباه نمی‌گیریم`}>
      <Toggle options={{ month: 'ماه جاری', quarter: '۳ ماه', year: 'سال جاری', all: 'همه' }} value={period.key} onChange={onPeriod} />
      <a className="btn-ghost" href={`/api/export/invoices?period=${period.key}`}><Icon name="download" size={17} /> خروجی فاکتور</a>
    </PageHeader>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="card p-4"><div className="text-sm text-ink-mute">سود اسمی</div><div className={`num mt-2 break-words text-2xl font-black ${s.monthNominal < 0 ? 'text-alarm' : 'text-ink'}`}>{priceShort(s.monthNominal)}</div><div className="text-sm text-ink-mute">{priceWords(s.monthNominal)}</div></div>
      <div className="card p-4"><div className="text-sm text-ink-mute">هزینه خواب سرمایه</div><div className="num mt-2 break-words text-2xl font-black text-alarm">{priceShort(data.cars.reduce((a, c) => a + (c.fin.capitalCost || 0), 0))}</div><div className="text-sm text-ink-mute">در پرونده‌های دوره</div></div>
      <div className="card p-4"><div className="text-sm text-ink-mute">سود واقعی</div><div className={`num mt-2 break-words text-2xl font-black ${s.monthReal < 0 ? 'text-alarm' : 'text-cash'}`}>{priceShort(s.monthReal)}</div><div className="text-sm text-ink-mute">بعد از خواب سرمایه</div></div>
      <div className="card p-4"><div className="text-sm text-ink-mute">ارزش سرمایه درگیر</div><div className="num mt-2 break-words text-2xl font-black text-plate">{priceShort(s.ownedCost)}</div><div className="text-sm text-ink-mute">هزینه فرصت ماهانه: {priceShort(s.capitalBurnMonthly)}</div></div>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Section title="فروش‌های دوره"><div className="divide-y divide-line">{sold.map((c) =>
        <Link key={c._id} href={`/cars/${c._id}`} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 break-words"><CarTitle car={c} href={false} /><div className="text-sm text-ink-mute">خریدار: {c.buyerName || 'ـ'} · {toFa(c.fin.days)} روز نگهداری</div></div>
          <div className="text-left"><div className={`num font-black ${c.fin.realProfit < 0 ? 'text-alarm' : 'text-cash'}`}>{priceShort(c.fin.realProfit)}</div><div className="text-sm text-ink-mute">واقعی</div></div>
        </Link>
      )}{!sold.length && <Empty>فروشی در این بازه نیست.</Empty>}</div></Section>
      <Section title="زیان‌ده یا پرریسک"><div className="divide-y divide-line">{risky.map((c) =>
        <Link key={c._id} href={`/cars/${c._id}`} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 break-words"><CarTitle car={c} href={false} /><div className="text-sm text-ink-mute">{c.fin.days >= data.settings.dormantDays ? `خواب ${toFa(c.fin.days)} روزه` : 'سود واقعی منفی'}</div></div>
          <div className="num text-left font-black text-alarm">{c.fin.realProfit === null ? priceShort(c.fin.capitalCost) : priceShort(c.fin.realProfit)}</div>
        </Link>
      )}{!risky.length && <Empty>خودروی زیان‌ده یا پرریسک در این بازه نیست.</Empty>}</div></Section>
    </div>
  </>;
}
