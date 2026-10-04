import { NextResponse } from 'next/server';
import { Contract, Cheque, Transaction } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { itemRoute, fail } from '@/lib/crud';

export const dynamic = 'force-dynamic';
const h = itemRoute(Contract, { populate: 'car' });
export const GET = h.GET;
export const PATCH = h.PATCH;

// حذف قولنامه + چک‌های وصول‌نشده و تراکنش‌هایی که خودش ساخته بود
export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id);
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    await Cheque.deleteMany({ contract: c._id, status: 'pending' });
    await Transaction.deleteMany({ _id: { $in: c.payments.map((p) => p.transaction).filter(Boolean) } });
    await c.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
