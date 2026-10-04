import { Customer } from '@/lib/models';
import { collectionRoute } from '@/lib/crud';

export const dynamic = 'force-dynamic';
const h = collectionRoute(Customer);
export const GET = h.GET;
export const POST = h.POST;
