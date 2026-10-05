import Link from 'next/link';
import { getPeriod, PERIODS } from '@/lib/period';
import { buildFinanceReport } from '@/lib/finance';
import { formatDateShort, priceShort, toFa } from '@/lib/persian';

export const dynamic = 'force-dynamic';

const box = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';
const th = 'whitespace-nowrap px-3 py-2 text-right text-xs font-bold text-ink-mute';
const td = 'whitespace-nowrap px-3 py-2 text-sm';
const neg = (n) => (n < 0 ? 'text-alarm font-bold' : '');

function Stat({ label, value, hint, cls = '' }) {
  return (
    <div className={`${box} ${cls}`}>
      <div className="text-xs text-ink-mute">{label}</div>
      <div className="text-lg font-black">{value}</div>
      {hint && <div className="text-xs text-ink-mute">{hint}</div>}
    </div>
  );
}

export default async function FinanceReportPage({ searchParams = {} }) {
  const period = getPeriod(searchParams.period || 'year');
  const r = await buildFinanceReport(period);
  const t = r.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-black">گزارش مالی واقعی</h1>
        <div className="mr-auto flex flex-wrap gap-2">
          {Object.entries(PERIODS).map(([k, l]) => (
            <Link key={k} href={`/reports/finance?period=${k}`} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${period.key === k ? 'bg-asphalt-900 text-white' : 'bg-gray-100'}`}>
              {l}
            </Link>
          ))}
          <a href={`/api/reports/finance?period=${period.key}&format=xlsx`} className="rounded-lg bg-cash px-3 py-1.5 text-sm font-bold text-white">
            خروجی اکسل
          </a>
        </div>
      </div>

      {r.warnings.length > 0 && <div className="rounded-xl bg-alarm-soft p-3 text-sm text-alarm">{r.warnings.join(' · ')}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`فروش (${toFa(t.count)} خودرو)`} value={`${priceShort(t.sales)} تومان`} />
        <Stat label="هزینه‌ها + کمیسیون" value={`${priceShort(t.expenses + t.commission)} تومان`} hint={`کمیسیون پرداخت‌نشده: ${priceShort(t.unpaidCommission)}`} />
        <Stat label="سود واقعی" value={`${priceShort(t.real)} تومان`} hint={`اسمی ${priceShort(t.nominal)} · خواب سرمایه ${priceShort(t.capitalCost)}`} cls={t.real < 0 ? 'text-alarm' : ''} />
        <Stat label="سهم نمایشگاه / شرکا" value={`${priceShort(t.showroom)} / ${priceShort(t.partners)}`} hint={`مطالبات باز: ${priceShort(t.receivable)}`} />
      </div>

      <section className={box}>
        <h2 className="mb-2 font-black">ماهانه</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>{['ماه', 'تعداد', 'فروش', 'هزینه', 'کمیسیون', 'سود اسمی', 'خواب سرمایه', 'سود واقعی', 'سهم شرکا', 'سهم نمایشگاه'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {r.months.map((m) => (
                <tr key={m.key} className="border-t border-gray-100">
                  <td className={td}>{toFa(m.label)}</td>
                  <td className={td}>{toFa(m.count)}</td>
                  <td className={td}>{priceShort(m.sales)}</td>
                  <td className={td}>{priceShort(m.expenses)}</td>
                  <td className={td}>{priceShort(m.commission)}</td>
                  <td className={`${td} ${neg(m.nominal)}`}>{priceShort(m.nominal)}</td>
                  <td className={td}>{priceShort(m.capitalCost)}</td>
                  <td className={`${td} font-bold ${neg(m.real)}`}>{priceShort(m.real)}</td>
                  <td className={td}>{priceShort(m.partners)}</td>
                  <td className={td}>{priceShort(m.showroom)}</td>
                </tr>
              ))}
              {!r.months.length && (
                <tr><td className={td} colSpan={10}>فروشی در این بازه ثبت نشده.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={box}>
        <h2 className="mb-2 font-black">سود هر خودرو</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>{['خودرو', 'تاریخ فروش', 'قولنامه', 'فروش', 'خرید/سهم مالک', 'هزینه', 'کمیسیون', 'روز', 'خواب سرمایه', 'سود واقعی', 'سهم شرکا', 'سهم نمایشگاه', 'مانده'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.id} className="border-t border-gray-100">
                  <td className={td}><Link href={`/cars/${x.id}`} className="font-bold hover:underline">{toFa(x.title)}</Link> <span className="text-xs text-ink-mute">{x.ownership}</span></td>
                  <td className={td}>{formatDateShort(x.saleDate)}</td>
                  <td className={td}>{toFa(x.contractNo) || '—'}</td>
                  <td className={td}>{priceShort(x.salePrice)}</td>
                  <td className={td}>{priceShort(x.base)}</td>
                  <td className={td}>{priceShort(x.expenses)}</td>
                  <td className={td}>{priceShort(x.commission)}</td>
                  <td className={td}>{toFa(x.days)}</td>
                  <td className={td}>{priceShort(x.capitalCost)}</td>
                  <td className={`${td} font-bold ${neg(x.realProfit)}`}>{priceShort(x.realProfit)}</td>
                  <td className={td} title={x.partners.map((p) => `${p.name}: ${p.share}%`).join('، ')}>{priceShort(x.partnersProfit)}</td>
                  <td className={td}>{priceShort(x.showroomProfit)}</td>
                  <td className={td}>{x.receivable == null ? '—' : priceShort(x.receivable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {r.partners.length > 0 && (
        <section className={box}>
          <h2 className="mb-2 font-black">سهم شرکا</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {r.partners.map((p) => (
              <div key={p.name} className="rounded-xl bg-gray-50 p-3 text-sm">
                <div className="font-bold">{p.name}</div>
                <div className="text-ink-soft">{toFa(p.cars)} خودرو · سرمایه {priceShort(p.capital)} · سود <b className={neg(p.profit)}>{priceShort(p.profit)}</b></div>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="text-xs text-ink-mute">سود واقعی = فروش − (خرید یا سهم مالک امانی) − هزینه‌ها − کمیسیون − هزینه خواب سرمایه (نرخ از تنظیمات). مبنای دوره، تاریخ فروش خودرو است.</p>
    </div>
  );
}
