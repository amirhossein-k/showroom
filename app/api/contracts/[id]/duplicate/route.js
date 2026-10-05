import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { withTransaction } from '@/lib/db';
import { fail } from '@/lib/crud';
import { duplicateAsDraft } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

// POST → پیش‌نویس جدید با همان اطلاعات (بدون چک/تراکنش/مدارک قبلی)
export async function POST(_req, { params }) {
  try {
    const c = await withTransaction(async (tx) => {
      const src = await Contract.findById(params.id).session(tx.session).lean();
      if (!src) throw Object.assign(new Error('یافت نشد'), { status: 404 });
      return duplicateAsDraft(src, tx);
    });
    return NextResponse.json(c, { status: 201 });
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
