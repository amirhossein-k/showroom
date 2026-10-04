import { connectDB, plain } from '@/lib/db';
import { Partner, Car } from '@/lib/models';
import PartnersClient from '@/components/PartnersClient';
export const dynamic = 'force-dynamic';
export default async function PartnersPage() { await connectDB(); const [p, c] = await Promise.all([Partner.find({}).sort({ name: 1 }).lean(), Car.find({ status: { $in: ['available', 'negotiating', 'reserved'] } }, 'partners').lean()]); return <PartnersClient partners={plain(p)} cars={plain(c)} />; }
