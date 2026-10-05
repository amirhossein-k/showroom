import { NextResponse } from 'next/server';
import { Cheque } from '@/lib/models';
import { itemRoute, fail } from '@/lib/crud';
import { syncFromCheque } from '@/lib/contractService';

export const dynamic = 'force-dynamic';
const h = itemRoute(Cheque);
export const GET = h.GET;
export const DELETE = h.DELETE;

// تغییر وضعیت چک در دفتر چک → قسط قرارداد هم همگام شود
export async function PATCH(req, ctx) {
  const res = await h.PATCH(req, ctx);
  if (res.ok) {
    try {
      await syncFromCheque(await res.clone().json());
    } catch (e) {
      console.error('cheque→contract sync failed', e);
    }
  }
  return res;
}
