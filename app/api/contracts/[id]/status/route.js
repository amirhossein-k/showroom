import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { signContract, cancelContract, markDelivered, markTransferred } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

// POST { action: 'sign' | 'cancel' | 'deliver' | 'transfer', reason?, refund?, date? }
export async function POST(req, { params }) {
  try {
    await connectDB();
    const { action, reason, refund, date } = await req.json();
    const c = await Contract.findById(params.id);
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    if (action === 'sign') await signContract(c);
    else if (action === 'cancel') await cancelContract(c, { reason, refund: !!refund });
    else if (action === 'deliver') await markDelivered(c, date);
    else if (action === 'transfer') await markTransferred(c, date);
    else return fail({ message: 'عملیات نامعتبر' });
    return NextResponse.json(c);
  } catch (e) {
    return fail(e);
  }
}
