import { connectDB, plain } from '@/lib/db';
import { Cheque, Car } from '@/lib/models';
import { daysBetween } from '@/lib/persian';
import ChequesClient from '@/components/ChequesClient';

export const dynamic = 'force-dynamic';
export default async function ChequesPage() {
  await connectDB();
  const [q, cars] = await Promise.all([Cheque.find({}).populate('car', 'brand model year').sort({ dueDate: 1 }).lean(), Car.find({ status: { $in: ['available', 'negotiating', 'reserved', 'sold', 'awaiting_transfer'] } }, 'brand model year').sort({ createdAt: -1 }).lean()]);
  const rows = plain(q).map((x) => ({ ...x, daysLeft: daysBetween(new Date(), x.dueDate) }));
  return <ChequesClient cheques={rows} cars={plain(cars)} />;
}
