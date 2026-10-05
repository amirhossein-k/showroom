import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Contract } from '@/lib/models';
import ContractManager from '@/components/ContractManager';

export const dynamic = 'force-dynamic';

export default async function ContractPage({ params }) {
  await connectDB();
  const raw = await Contract.findById(params.id).populate('car', 'brand model year plate').lean();
  if (!raw) notFound();
  return (
    <div className="space-y-3">
      <Link href="/contracts" className="text-sm text-ink-soft">← همه قولنامه‌ها</Link>
      <ContractManager contract={plain(raw)} />
    </div>
  );
}
