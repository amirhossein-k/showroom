import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { setPaymentStatus } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

// PATCH { status: 'pending' | 'paid' | 'bounced', paidAt? }
export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const { status, paidAt } = await req.json();
    const c = await Contract.findById(params.id);
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    await setPaymentStatus(c, params.pid, status, paidAt);
    return NextResponse.json(c);
  } catch (e) {
    return fail(e);
  }
}
