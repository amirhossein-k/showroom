import { NextResponse } from 'next/server';
import { Cheque, Transaction } from '@/lib/models';
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
      // [collections] چکی که از «پاس شد» خارج شود دیگر وصول‌شده نیست: دریافتِ خودکار حذف و دریافتِ دستیِ متصل، تأییدنشده می‌شود
      if (q.status !== 'cleared') {
        const o = { session: tx.session || undefined };
        await Transaction.deleteMany({ cheque: q._id, source: 'cheque' }, o);
        await Transaction.updateMany({ cheque: q._id }, { $set: { verified: false }, $unset: { cheque: 1, verifiedAt: 1, bankRef: 1, bankDate: 1 } }, o);
      }
      return q;
    });
    return NextResponse.json(doc);
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
