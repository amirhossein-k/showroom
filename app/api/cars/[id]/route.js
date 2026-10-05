import { NextResponse } from 'next/server';
import { Car } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { itemRoute, clean, fail } from '@/lib/crud';
import { getSettings } from '@/lib/settings';
import { markSoldInChannel, carCaption } from '@/lib/telegramExtra';
import { syncCarInChannel, imagesKey } from '@/lib/channelSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const h = itemRoute(Car);
export const GET = h.GET;
export const DELETE = h.DELETE;

const SOLD = ['sold', 'awaiting_transfer'];

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const car = await Car.findByIdAndUpdate(params.id, { $set: clean(await req.json()) }, { new: true, runValidators: true });
    if (!car) return fail({ message: 'یافت نشد' }, 404);

    let channel = null;
    if (car.channelPost?.messageId) {
      const settings = await getSettings();
      if (SOLD.includes(car.status) && !car.channelPost.soldMarked) {
        // وقتی ماشین فروخته شد، آگهی کانال را «فروخته شد» کن
        const r = await markSoldInChannel(car.toObject(), settings);
        channel = r.ok ? 'sold' : r.error;
        if (r.ok) {
          car.channelPost = { ...car.channelPost.toObject(), soldMarked: true, caption: carCaption(car.toObject(), settings, { sold: true }), imagesKey: imagesKey(car) };
          car.markModified('channelPost');
          await car.save();
        }
      } else {
        // هر ویرایش دیگری (قیمت، کارکرد، تیپ، رنگ، عکس…) → آگهی کانال به‌روز شود
        const r = await syncCarInChannel(car.toObject(), settings);
        channel = r.ok ? (r.changed ? (r.reposted ? 'reposted' : 'updated') : 'unchanged') : r.error;
        if (r.ok && r.channelPost) {
          car.channelPost = r.channelPost;
          car.markModified('channelPost');
          await car.save();
        }
      }
    }
    return NextResponse.json({ ...car.toObject(), _extras: { channel } });
  } catch (e) {
    return fail(e);
  }
}
