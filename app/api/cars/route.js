import { NextResponse } from 'next/server';
import { Car, Customer } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { collectionRoute, clean, fail } from '@/lib/crud';
import { getSettings } from '@/lib/settings';
import { postCarToChannel, notifyMatchingCustomers } from '@/lib/telegramExtra';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const h = collectionRoute(Car);
export const GET = h.GET;

// ساخت خودرو + (در صورت فعال بودن) انتشار در کانال و خبر دادن به مشتری‌های منتظر
export async function POST(req) {
  try {
    await connectDB();
    const car = await Car.create(clean(await req.json()));
    const settings = await getSettings();
    const extras = {};
    if (car.status === 'available') {
      if (settings.autoPostChannel !== false) {
        const r = await postCarToChannel(car.toObject(), settings);
        extras.channel = r.ok ? 'ok' : r.error;
        if (r.ok) car.channelPost = r.channelPost;
      }
      if (settings.autoNotifyMatches !== false) {
        const customers = await Customer.find({}).lean();
        const r = await notifyMatchingCustomers(car.toObject(), customers, settings);
        extras.notified = r.sent.length;
        if (r.sent.length) car.notifiedCustomers = [...(car.notifiedCustomers || []), ...r.sent];
      }
      await car.save();
    }
    return NextResponse.json({ ...car.toObject(), _extras: extras }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
