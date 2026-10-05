import Link from 'next/link';
import { connectDB, plain } from '@/lib/db';
import { Contract } from '@/lib/models';
import { formatDate, priceShort, toFa, normalizeFa } from '@/lib/persian';
import { CONTRACT_STATUS, contractSummary } from '@/lib/contractDefaults';
import { missingDocs } from '@/lib/contractDocs';

export const dynamic = 'force-dynamic';

const TABS = { all: 'همه', draft: 'پیش‌نویس', signed: 'امضاشده', cancelled: 'لغوشده' };

export default async function ContractsPage({ searchParams = {} }) {
  await connectDB();
  const tab = TABS[searchParams.status] ? searchParams.status : 'all';
  const q = normalizeFa(searchParams.q || '');
  const all = plain(await Contract.find({}).select('-documents.key -inquiries.raw').sort({ createdAt: -1 }).populate('car', 'brand model year').lean());
  const list = all.filter((c) => {
    if (tab !== 'all' && (c.status || 'signed') !== tab) return false;
    if (!q) return true;
    const hay = normalizeFa([c.number, c.buyer?.name, c.buyer?.nationalId, c.buyer?.phone, c.car?.brand, c.car?.model].join(' '));
    return hay.includes(q);
  });

  const signed = all.filter((c) => c.status === 'signed');
  const sums = signed.map((c) => contractSummary(c));
  const totalSales = signed.reduce((a, c) => a + c.totalPrice, 0);
  const receivable = sums.reduce((a, s) => a + s.remaining, 0);
  const overdue = sums.reduce((a, s) => a + s.overdueCount, 0);
  const awaitingTransfer = signed.filter((c) => !c.transferredAt).length;
  const noDocs = signed.filter((c) => missingDocs(c).length).length;

  const box = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-black">قولنامه‌ها</h1>
        <div className="mr-auto flex gap-2">
          <Link href="/reports/finance" className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold">گزارش مالی</Link>
          <Link href="/contracts/new" className="rounded-xl bg-asphalt-900 px-4 py-2 text-sm font-bold text-white">+ قولنامه جدید</Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className={box}><div className="text-xs text-ink-mute">جمع فروش (امضاشده)</div><div className="text-lg font-black">{priceShort(totalSales)} تومان</div></div>
        <div className={box}><div className="text-xs text-ink-mute">مطالبات باز</div><div className="text-lg font-black">{priceShort(receivable)} تومان</div></div>
        <div className={`${box} ${overdue ? 'text-alarm' : ''}`}><div className="text-xs text-ink-mute">اقساط معوق</div><div className="text-lg font-black">{toFa(overdue)}</div></div>
        <div className={box}><div className="text-xs text-ink-mute">منتظر انتقال سند</div><div className="text-lg font-black">{toFa(awaitingTransfer)}</div></div>
        <div className={`${box} ${noDocs ? 'text-amberx' : ''}`}><div className="text-xs text-ink-mute">مدارک ناقص</div><div className="text-lg font-black">{toFa(noDocs)}</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(TABS).map(([k, l]) => (
          <Link key={k} href={`/contracts?status=${k}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ''}`} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-asphalt-900 text-white' : 'bg-gray-100'}`}>
            {l}
          </Link>
        ))}
        <form className="mr-auto" action="/contracts">
          <input type="hidden" name="status" value={tab} />
          <input name="q" defaultValue={searchParams.q || ''} placeholder="جستجو: شماره، خریدار، کد ملی…" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
        </form>
      </div>

      {!list.length && (
        <div className={`${box} text-center text-sm text-ink-mute`}>
          قولنامه‌ای پیدا نشد. <Link href="/contracts/new" className="font-bold text-asphalt-900 underline">قولنامه جدید بساز</Link>
        </div>
      )}
      <div className="space-y-2">
        {list.map((c) => {
          const st = CONTRACT_STATUS[c.status || 'signed'];
          const s = contractSummary(c);
          const miss = c.status === 'signed' ? missingDocs(c).length : 0;
          return (
            <Link key={c._id} href={`/contracts/${c._id}`} className={`${box} flex items-center justify-between gap-3 hover:border-asphalt-900`}>
              <div>
                <div className="flex flex-wrap items-center gap-2 font-bold">
                  {c.car ? `${c.car.brand} ${c.car.model} ${toFa(c.car.year || '')}` : 'خودرو حذف شده'}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                  {c.status === 'signed' && s.overdueCount > 0 && <span className="rounded-full bg-alarm px-2 py-0.5 text-xs text-white">{toFa(s.overdueCount)} معوق</span>}
                  {miss > 0 && <span className="rounded-full bg-amberx-soft px-2 py-0.5 text-xs text-amberx">{toFa(miss)} مدرک ناقص</span>}
                </div>
                <div className="text-sm text-ink-soft">خریدار: {c.buyer?.name} · شماره {toFa(c.number)}</div>
              </div>
              <div className="text-left">
                <div className="font-black">{priceShort(c.totalPrice)} تومان</div>
                <div className="text-xs text-ink-mute">
                  {formatDate(c.date)} · {toFa(c.payments.filter((p) => p.kind === 'cheque').length)} چک
                  {c.status === 'signed' && ` · مانده ${priceShort(s.remaining)}`}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
