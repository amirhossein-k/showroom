import { loadOverview } from '@/lib/overview';
import ReportsClient from '@/components/ReportsClient';
import { getPeriod } from '@/lib/period';
export const dynamic = 'force-dynamic';
export default async function ReportsPage({ searchParams }) { const p = getPeriod(searchParams.period || 'month'); const o = await loadOverview(p.key); return <ReportsClient data={o} period={p} />; }
