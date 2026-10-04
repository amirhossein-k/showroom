import { Colleague } from '@/lib/models';
import { itemRoute } from '@/lib/crud';

export const dynamic = 'force-dynamic';
const h = itemRoute(Colleague);
export const GET = h.GET;
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;
