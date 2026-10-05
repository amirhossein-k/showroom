import { loadOverview } from '@/lib/overview';
import OverviewClient from '@/components/OverviewClient';
import { loadCollections } from '@/lib/collectionsData';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await loadOverview();
  const col = await loadCollections(data); // [collections]
  return <OverviewClient data={{ ...data, collectionAlerts: col.alerts, collectionTotals: col.totals }} />;
}
