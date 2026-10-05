import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { withTransaction } from '@/lib/db';
import { fail } from '@/lib/crud';
import { setPaymentStatus } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

// PATCH { status: 'pending' | 'paid' | 'bounced', paidAt? }
export async function PATCH(req, { params }) {
  try {
    const { status, paidAt } = await req.json();
    const c = await withTransaction(async (tx) => {
      const c = await Contract.findById(params.id).session(tx.session);
      if (!c) throw Object.assign(new Error('یافت نشد'), { status: 404 });
      await setPaymentStatus(c, params.pid, status, paidAt, tx);
      return c;
    });
    return NextResponse.json(c);
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
