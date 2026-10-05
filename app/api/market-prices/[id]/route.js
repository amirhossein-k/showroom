import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { MarketPrice, sanitizeMarketPrice } from '@/lib/marketPrices';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const patch = sanitizeMarketPrice(await req.json(), { partial: true });
    const doc = await MarketPrice.findByIdAndUpdate(params.id, { $set: patch }, { new: true, runValidators: true });
    if (!doc) return fail({ message: 'یافت نشد' }, 404);
    return NextResponse.json(doc);
  } catch (e) {
    return fail(e, e.status || 400);
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    await MarketPrice.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
