import { connectDB, plain } from '@/lib/db';
import { Colleague } from '@/lib/models';
import ColleaguesClient from '@/components/ColleaguesClient';
export const dynamic = 'force-dynamic';
export default async function ColleaguesPage() { await connectDB(); return <ColleaguesClient colleagues={plain(await Colleague.find({}).sort({ showroom: 1 }).lean())} />; }
