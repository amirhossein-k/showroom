import { NextResponse } from 'next/server';
import { Car } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { itemRoute, clean, fail } from '@/lib/crud';
import { getSettings } from '@/lib/settings';
import { markSoldInChannel } from '@/lib/telegramExtra';

export const dynamic = 'force-dynamic';
const h = itemRoute(Car);
export const GET = h.GET;
export const DELETE = h.DELETE;

const SOLD = ['sold', 'awaiting_transfer'];

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const car = await Car.findByIdAndUpdate(params.id, { $set: clean(await req.json()) }, { new: true, runValidators: true });
    if (!car) return fail({ message: 'یافت نشد' }, 404);
    // وقتی ماشین فروخته شد، آگهی کانال را به‌روز کن
    if (SOLD.includes(car.status) && car.channelPost?.messageId && !car.channelPost.soldMarked) {
      const r = await markSoldInChannel(car.toObject(), await getSettings());
      if (r.ok) {
        car.channelPost.soldMarked = true;
        car.markModified('channelPost');
        await car.save();
      }
    }
    return NextResponse.json(car);
  } catch (e) {
    return fail(e);
  }
}
