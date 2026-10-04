import Link from 'next/link';
import { connectDB, plain } from '@/lib/db';
import { Contract } from '@/lib/models';
import { formatDate, priceShort, toFa } from '@/lib/persian';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  await connectDB();
  const list = plain(await Contract.find({}).sort({ createdAt: -1 }).populate('car', 'brand model year').lean());
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">قولنامه‌ها</h1>
      {!list.length && <div className="text-ink-soft">هنوز قولنامه‌ای ثبت نشده. از صفحه هر خودرو «ثبت قولنامه» را بزن.</div>}
      <div className="divide-y rounded-xl border border-gray-100 bg-white">
        {list.map((c) => (
          <Link key={c._id} href={`/contracts/${c._id}/print`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-gray-50">
            <div>
              <div className="font-bold">{c.car ? `${c.car.brand} ${c.car.model} ${toFa(c.car.year || '')}` : 'خودرو حذف شده'}</div>
              <div className="text-sm text-ink-soft">خریدار: {c.buyer?.name} · شماره {toFa(c.number)}</div>
            </div>
            <div className="text-left text-sm">
              <div className="font-bold">{priceShort(c.totalPrice)} تومان</div>
              <div className="text-ink-soft">{formatDate(c.date)} · {toFa(c.payments.filter((p) => p.kind === 'cheque').length)} چک</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
