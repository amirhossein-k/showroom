import { Transaction } from '@/lib/models';
import { itemRoute } from '@/lib/crud';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { transactionPayload } from '@/lib/transactionPayload';

export const dynamic = 'force-dynamic';
const h = itemRoute(Transaction);
export const GET = h.GET;
export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const current = await Transaction.findById(params.id);
    if (!current) return fail({ message: 'تراکنش یافت نشد' }, 404);
    const data = transactionPayload(await req.json(), { partial: true, linked: Boolean(current.contract) });
    const doc = await Transaction.findByIdAndUpdate(params.id, { $set: data }, { new: true, runValidators: true });
    if (!doc) return fail({ message: 'تراکنش یافت نشد' }, 404);
    return NextResponse.json(doc);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req, context) {
  try {
    await connectDB();
    const current = await Transaction.findById(context.params.id);
    if (!current) return fail({ message: 'تراکنش یافت نشد' }, 404);
    if (current.contract) return fail({ message: 'تراکنش متصل به قولنامه باید از همان قولنامه مدیریت شود.' }, 409);
    return h.DELETE(req, context);
  } catch (error) {
    return fail(error);
  }
}
