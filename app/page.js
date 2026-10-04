import { loadOverview } from '@/lib/overview';
import OverviewClient from '@/components/OverviewClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await loadOverview();
  return <OverviewClient data={data} />;
}
