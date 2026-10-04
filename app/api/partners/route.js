import { Partner } from '@/lib/models';
import { collectionRoute } from '@/lib/crud';

export const dynamic = 'force-dynamic';
const h = collectionRoute(Partner);
export const GET = h.GET;
export const POST = h.POST;
