import { NextResponse } from 'next/server';
import { Car } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { getSettings } from '@/lib/settings';
import { postCarToChannel, markSoldInChannel } from '@/lib/telegramExtra';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// POST /api/cars/:id/publish          → انتشار (یا انتشار دوباره) در کانال
// POST /api/cars/:id/publish?sold=1   → علامت «فروخته شد» روی آگهی
export async function POST(req, { params }) {
  try {
    await connectDB();
    const car = await Car.findById(params.id);
    if (!car) return fail({ message: 'یافت نشد' }, 404);
    const settings = await getSettings();
    if (req.nextUrl.searchParams.get('sold')) {
      const r = await markSoldInChannel(car.toObject(), settings);
      if (!r.ok) return fail({ message: r.error }, 502);
      car.channelPost.soldMarked = true;
      car.markModified('channelPost');
      await car.save();
      return NextResponse.json({ ok: true });
    }
    const r = await postCarToChannel(car.toObject(), settings);
    if (!r.ok) return fail({ message: r.error }, 502);
    car.channelPost = r.channelPost;
    await car.save();
    return NextResponse.json({ ok: true, channelPost: r.channelPost });
  } catch (e) {
    return fail(e, 500);
  }
}
