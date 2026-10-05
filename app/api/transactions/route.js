import { Transaction } from '@/lib/models';
import { collectionRoute } from '@/lib/crud';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { transactionPayload } from '@/lib/transactionPayload';

export const dynamic = 'force-dynamic';
const h = collectionRoute(Transaction);
export const GET = h.GET;
export async function POST(req) {
  try {
    const data = transactionPayload(await req.json());
    await connectDB();
    return NextResponse.json(await Transaction.create(data), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
