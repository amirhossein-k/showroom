import { connectDB, plain } from '@/lib/db';
import { Transaction, Car, Cheque, Contract } from '@/lib/models';
import { loadOverview } from '@/lib/overview';
import { buildReceivableRows } from '@/lib/receivables';
import CashflowClient from '@/components/CashflowClient';
export const dynamic = 'force-dynamic';
export default async function CashflowPage() {
  await connectDB();
  const [t, cars, q, o] = await Promise.all([Transaction.find({}).populate('car', 'brand model year').sort({ date: -1 }).lean(), Car.find({}, 'brand model year').sort({ createdAt: -1 }).lean(), Cheque.find({ status: 'pending' }).sort({ dueDate: 1 }).lean(), loadOverview()]);
  const signedContracts = o.receivables.length
    ? plain(await Contract.find({ car: { $in: o.receivables.map((c) => c._id) }, status: 'signed' })
        .select('car number buyer.name status').sort({ signedAt: -1, _id: -1 }).lean())
    : [];
  const receivables = buildReceivableRows(o.receivables, signedContracts, plain(q));
  return <CashflowClient transactions={plain(t)} cars={plain(cars)} cheques={plain(q)} stats={o.stats} receivables={receivables} />;
}
