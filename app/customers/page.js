import { connectDB, plain } from '@/lib/db';
import { Customer, Car } from '@/lib/models';
import CustomersClient from '@/components/CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  await connectDB();
  const [c, cars] = await Promise.all([Customer.find({}).populate('interestedCars', 'brand model year').sort({ nextFollowUp: 1 }).lean(), Car.find({ status: { $in: ['available', 'negotiating', 'reserved'] } }, 'brand model year askingPrice color').sort({ createdAt: -1 }).lean()]);
  return <CustomersClient customers={plain(c)} cars={plain(cars)} />;
}
