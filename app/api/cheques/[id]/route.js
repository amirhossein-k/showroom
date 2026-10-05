import { NextResponse } from 'next/server';
import { Cheque } from '@/lib/models';
import { withTransaction } from '@/lib/db';
import { itemRoute, clean, fail } from '@/lib/crud';
import { syncFromCheque } from '@/lib/contractService';

export const dynamic = 'force-dynamic';
const h = itemRoute(Cheque);
export const GET = h.GET;
export const DELETE = h.DELETE;

// تغییر چک در دفتر چک + همگام‌سازی قسط قرارداد — در یک تراکنش
export async function PATCH(req, { params }) {
  try {
    const body = clean(await req.json());
    const doc = await withTransaction(async (tx) => {
      const q = await Cheque.findByIdAndUpdate(params.id, { $set: body }, { new: true, runValidators: true, session: tx.session || undefined });
      if (!q) throw Object.assign(new Error('یافت نشد'), { status: 404 });
      await syncFromCheque(q, tx);
      return q;
    });
    return NextResponse.json(doc);
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
