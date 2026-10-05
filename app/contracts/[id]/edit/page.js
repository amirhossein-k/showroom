import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Contract, Customer } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import ContractForm from '@/components/ContractForm';

export const dynamic = 'force-dynamic';

export default async function EditContractPage({ params }) {
  await connectDB();
  const raw = await Contract.findById(params.id).populate('car').lean();
  if (!raw) notFound();
  if (raw.status !== 'draft') redirect(`/contracts/${params.id}`);
  const [customers, settings] = await Promise.all([Customer.find({}).sort({ createdAt: -1 }).lean(), getSettings()]);
  const c = plain(raw);
  return (
    <div className="space-y-3">
      <Link href={`/contracts/${c._id}`} className="text-sm text-ink-soft">← بازگشت</Link>
      <h1 className="text-xl font-black">ویرایش پیش‌نویس قولنامه {c.car?.brand} {c.car?.model}</h1>
      <ContractForm car={c.car} customers={plain(customers)} settings={settings} contract={{ ...c, car: c.car?._id }} />
    </div>
  );
}
