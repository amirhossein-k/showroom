import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { withTransaction } from '@/lib/db';
import { fail } from '@/lib/crud';
import { signContract, cancelContract, markDelivered, markTransferred } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

// POST { action: 'sign' | 'cancel' | 'deliver' | 'transfer', reason?, refund?, date? }
// هر عملیات اتمیک است: یا همه تغییرات (قرارداد + چک‌ها + نقدینگی + خودرو) ثبت می‌شود یا هیچ‌کدام
export async function POST(req, { params }) {
  try {
    const { action, reason, refund, date } = await req.json();
    if (!['sign', 'cancel', 'deliver', 'transfer'].includes(action)) return fail({ message: 'عملیات نامعتبر' });
    const c = await withTransaction(async (tx) => {
      const c = await Contract.findById(params.id).session(tx.session);
      if (!c) throw Object.assign(new Error('یافت نشد'), { status: 404 });
      if (action === 'sign') await signContract(c, tx);
      else if (action === 'cancel') await cancelContract(c, { reason, refund: !!refund }, tx);
      else if (action === 'deliver') await markDelivered(c, date, tx);
      else await markTransferred(c, date, tx);
      return c;
    });
    return NextResponse.json(c);
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
