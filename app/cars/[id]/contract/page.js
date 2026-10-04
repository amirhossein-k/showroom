import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Car, Customer } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import ContractForm from '@/components/ContractForm';

export const dynamic = 'force-dynamic';

export default async function NewContractPage({ params }) {
  await connectDB();
  const [car, customers, settings] = await Promise.all([Car.findById(params.id).lean(), Customer.find({}).sort({ createdAt: -1 }).lean(), getSettings()]);
  if (!car) notFound();
  return (
    <div className="space-y-4">
      <Link href={`/cars/${params.id}`} className="text-sm text-ink-soft">← بازگشت به پرونده</Link>
      <h1 className="text-xl font-black">قولنامه {car.brand} {car.model}</h1>
      <ContractForm car={plain(car)} customers={plain(customers)} settings={plain(settings)} />
    </div>
  );
}
