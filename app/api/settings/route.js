import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Setting } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { clean, fail } from '@/lib/crud';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (e) {
    return fail(e, 500);
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const body = clean(await req.json());
    delete body.key;
    const s = await Setting.findOneAndUpdate({ key: 'main' }, { $set: body }, { new: true, upsert: true });
    return NextResponse.json(s);
  } catch (e) {
    return fail(e);
  }
}
