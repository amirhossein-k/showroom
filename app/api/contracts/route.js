import { NextResponse } from 'next/server';
import { Car, Contract, Cheque, Transaction, Customer } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { clean, fail } from '@/lib/crud';
import { toJalali } from '@/lib/jalali';
import { getSettings } from '@/lib/settings';
import { markSoldInChannel } from '@/lib/telegramExtra';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const list = await Contract.find({}).sort({ createdAt: -1 }).populate('car', 'brand model year plate').lean();
    return NextResponse.json(list);
  } catch (e) {
    return fail(e, 500);
  }
}

// ثبت قولنامه:
// - برای هر قسط چکی یک چک دریافتی در دفتر چک ساخته می‌شود (یادآور سررسید خودکار فعال است)
// - پرداخت نقدی/کارت‌به‌کارت پرداخت‌شده در دفتر نقدینگی ثبت می‌شود
// - وضعیت خودرو «منتظر انتقال سند» و قیمت فروش ثبت می‌شود
export async function POST(req) {
  try {
    await connectDB();
    const body = clean(await req.json());
    const car = await Car.findById(body.car);
    if (!car) return fail({ message: 'خودرو یافت نشد' }, 404);
    const payments = (body.payments || []).filter((p) => Number(p.amount) > 0);
    const sum = payments.reduce((a, p) => a + Number(p.amount), 0);
    if (Math.abs(sum - Number(body.totalPrice)) > 1) {
      return fail({ message: `جمع پرداخت‌ها (${sum.toLocaleString('fa-IR')}) با مبلغ کل قرارداد برابر نیست.` });
    }

    const jy = toJalali(new Date()).jy;
    const count = await Contract.countDocuments({});
    const contract = await Contract.create({ ...body, payments, number: body.number || `${jy}-${String(count + 1).padStart(4, '0')}` });

    for (const p of contract.payments) {
      if (p.kind === 'cheque') {
        const q = await Cheque.create({
          direction: 'received',
          number: p.number,
          sayadId: p.sayadId,
          bank: p.bank,
          amount: p.amount,
          dueDate: p.dueDate || contract.date,
          party: contract.buyer?.name,
          phone: contract.buyer?.phone,
          car: car._id,
          contract: contract._id,
          status: 'pending',
          note: `قولنامه ${contract.number}`,
        });
        p.cheque = q._id;
      } else if (p.paid) {
        const t = await Transaction.create({
          car: car._id,
          direction: 'in',
          category: 'sale',
          method: p.kind === 'cash' ? 'cash' : 'transfer',
          amount: p.amount,
          date: p.dueDate || contract.date,
          party: contract.buyer?.name,
          note: `قولنامه ${contract.number}`,
        });
        p.transaction = t._id;
      }
    }
    await contract.save();

    car.salePrice = contract.totalPrice;
    car.saleDate = contract.date;
    car.buyerName = contract.buyer?.name;
    if (contract.customer) car.buyer = contract.customer;
    car.status = 'awaiting_transfer';
    // آگهی کانال را «فروخته شد» کن
    if (car.channelPost?.messageId && !car.channelPost.soldMarked) {
      const r = await markSoldInChannel(car.toObject(), await getSettings());
      if (r.ok) {
        car.channelPost.soldMarked = true;
        car.markModified('channelPost');
      }
    }
    await car.save();
    if (contract.customer) await Customer.findByIdAndUpdate(contract.customer, { $set: { status: 'won' } });

    return NextResponse.json(contract, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
