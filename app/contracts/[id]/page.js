import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Contract } from '@/lib/models';
import ContractManager from '@/components/ContractManager';
import ContractDocuments from '@/components/ContractDocuments';
import ContractInquiry from '@/components/ContractInquiry';
import ContractDuplicateButton from '@/components/ContractDuplicateButton';
import { inquiryEnabled } from '@/lib/inquiry';

export const dynamic = 'force-dynamic';

export default async function ContractPage({ params }) {
  await connectDB();
  const raw = await Contract.findById(params.id).select('-documents.key -inquiries.raw').populate('car', 'brand model year plate vin').lean();
  if (!raw) notFound();
  const c = plain(raw);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Link href="/contracts" className="text-sm text-ink-soft">← همه قولنامه‌ها</Link>
        <ContractDuplicateButton id={c._id} status={c.status} />
      </div>
      <ContractManager contract={c} />
      <ContractInquiry contract={c} online={{ fines: inquiryEnabled('fines'), seizure: inquiryEnabled('seizure') }} />
      <ContractDocuments contractId={c._id} initial={c.documents || []} status={c.status} />
    </div>
  );
}
