import { NextResponse } from 'next/server';
import { Car, Customer } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { getSettings } from '@/lib/settings';
import { notifyMatchingCustomers } from '@/lib/telegramExtra';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(_req, { params }) {
  try {
    await connectDB();
    const car = await Car.findById(params.id);
    if (!car) return fail({ message: 'یافت نشد' }, 404);
    const customers = await Customer.find({}).lean();
    const r = await notifyMatchingCustomers(car.toObject(), customers, await getSettings());
    if (r.sent.length) {
      car.notifiedCustomers = [...(car.notifiedCustomers || []), ...r.sent];
      await car.save();
    }
    return NextResponse.json(r);
  } catch (e) {
    return fail(e, 500);
  }
}
