import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Car, Customer, Contract } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { toFa } from '@/lib/persian';
import ContractForm from '@/components/ContractForm';

export const dynamic = 'force-dynamic';

export default async function NewContractPage({ params }) {
  await connectDB();
  const [car, customers, settings, existing] = await Promise.all([
    Car.findById(params.id).lean(),
    Customer.find({}).sort({ createdAt: -1 }).lean(),
    getSettings(),
    Contract.find({ car: params.id, status: { $in: ['draft', 'signed'] } }).sort({ createdAt: -1 }).lean(),
  ]);
  if (!car) notFound();
  const signed = existing.find((c) => c.status === 'signed');
  const drafts = existing.filter((c) => c.status === 'draft');
  return (
    <div className="space-y-3">
      <Link href={`/cars/${car._id}`} className="text-sm text-ink-soft">← بازگشت به پرونده</Link>
      <h1 className="text-xl font-black">قولنامه {car.brand} {car.model}</h1>
      {signed && (
        <div className="rounded-xl bg-alarm-soft p-3 text-sm text-alarm">
          این خودرو قولنامه امضاشده دارد (<Link className="underline" href={`/contracts/${signed._id}`}>شماره {toFa(signed.number)}</Link>). برای قرارداد جدید اول آن را لغو کن؛ فعلاً فقط می‌توانی پیش‌نویس بسازی.
        </div>
      )}
      {drafts.length > 0 && (
        <div className="rounded-xl bg-amberx-soft p-3 text-sm">
          پیش‌نویس باز: {drafts.map((d) => (
            <Link key={d._id} className="mx-1 underline" href={`/contracts/${d._id}/edit`}>{toFa(d.number)}</Link>
          ))}
        </div>
      )}
      <ContractForm car={plain(car)} customers={plain(customers)} settings={settings} />
    </div>
  );
}
