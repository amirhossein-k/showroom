import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Car, Contract } from '@/lib/models';
import { CAR_STATUS } from '@/lib/constants';
import { priceShort, toFa, normalizeFa } from '@/lib/persian';

export const dynamic = 'force-dynamic';

// انتخاب خودرو برای قولنامه جدید (قبلاً فقط از صفحه هر خودرو ممکن بود)
export default async function NewContractPickerPage({ searchParams = {} }) {
  if (searchParams.car) redirect(`/cars/${searchParams.car}/contract`);
  await connectDB();
  const q = normalizeFa(searchParams.q || '');
  const showAll = searchParams.all === '1';
  const [cars, open] = await Promise.all([
    Car.find(showAll ? {} : { status: { $in: ['available', 'negotiating', 'reserved'] } })
      .select('brand model trim year color plate status askingPrice images ownership')
      .sort({ updatedAt: -1 })
      .lean(),
    Contract.find({ status: { $in: ['draft', 'signed'] } }).select('car status number').lean(),
  ]);
  const byCar = {};
  for (const c of open) (byCar[String(c.car)] ||= []).push(c);
  const list = plain(cars).filter((c) => !q || normalizeFa([c.brand, c.model, c.trim, c.year, c.color, c.plate?.p1, c.plate?.p2].join(' ')).includes(q));

  const box = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';
  return (
    <div className="space-y-4">
      <Link href="/contracts" className="text-sm text-ink-soft">← همه قولنامه‌ها</Link>
      <h1 className="text-xl font-black">قولنامه جدید: خودرو را انتخاب کن</h1>
      <form className="flex flex-wrap gap-2" action="/contracts/new">
        <input name="q" defaultValue={searchParams.q || ''} placeholder="برند، مدل، سال، پلاک…" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        {showAll && <input type="hidden" name="all" value="1" />}
        <button className="rounded-lg bg-asphalt-900 px-4 py-2 text-sm font-bold text-white">جستجو</button>
        <Link href={showAll ? '/contracts/new' : '/contracts/new?all=1'} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold">
          {showAll ? 'فقط موجودها' : 'نمایش همه خودروها'}
        </Link>
      </form>

      {!list.length && <div className={`${box} text-sm text-ink-mute`}>خودرویی پیدا نشد. <Link href="/cars/new" className="font-bold underline">خودرو جدید ثبت کن</Link></div>}
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((c) => {
          const ks = byCar[String(c._id)] || [];
          const signed = ks.find((k) => k.status === 'signed');
          const drafts = ks.filter((k) => k.status === 'draft');
          const st = CAR_STATUS[c.status] || {};
          return (
            <div key={c._id} className={`${box} flex items-center gap-3`}>
              {c.images?.[0] ? <img src={c.images[0]} alt="" className="h-14 w-20 rounded-lg object-cover" /> : <div className="h-14 w-20 rounded-lg bg-gray-100" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 font-bold">
                  {c.brand} {c.model} {toFa(c.year || '')}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${st.cls || ''}`}>{st.label}</span>
                </div>
                <div className="text-xs text-ink-mute">
                  {c.color || ''} {c.askingPrice ? `· ${priceShort(c.askingPrice)} تومان` : ''}
                  {signed && <span className="text-alarm"> · قولنامه امضاشده {toFa(signed.number)}</span>}
                  {drafts.length > 0 && <span className="text-amberx"> · {toFa(drafts.length)} پیش‌نویس باز</span>}
                </div>
              </div>
              {signed ? (
                <Link href={`/contracts/${signed._id}`} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold">مشاهده</Link>
              ) : drafts.length ? (
                <div className="flex flex-col gap-1">
                  <Link href={`/contracts/${drafts[0]._id}/edit`} className="rounded-lg bg-amberx-soft px-3 py-1.5 text-xs font-bold text-amberx">ادامه پیش‌نویس</Link>
                  <Link href={`/cars/${c._id}/contract`} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold">جدید</Link>
                </div>
              ) : (
                <Link href={`/cars/${c._id}/contract`} className="rounded-lg bg-asphalt-900 px-3 py-2 text-sm font-bold text-white">ثبت قولنامه</Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
