import { NextResponse } from 'next/server';
import { Car, Contract } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { clean, fail } from '@/lib/crud';
import { normalizePayload, validateContract, nextContractNumber, signContract } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

// GET /api/contracts?status=signed&car=<id>
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter = {};
    if (searchParams.get('status')) filter.status = searchParams.get('status');
    if (searchParams.get('car')) filter.car = searchParams.get('car');
    const list = await Contract.find(filter).sort({ createdAt: -1 }).populate('car', 'brand model year plate').lean();
    return NextResponse.json(list);
  } catch (e) {
    return fail(e, 500);
  }
}

// ثبت قولنامه
// status=draft  → فقط ذخیره، هیچ اثری روی دفتر چک/نقدینگی/خودرو ندارد
// status=signed → چک‌ها در دفتر چک، دریافتی‌ها در نقدینگی، خودرو «منتظر انتقال سند»
export async function POST(req) {
  try {
    await connectDB();
    const raw = clean(await req.json());
    const wantSign = raw.status === 'signed';
    const data = normalizePayload(raw);

    const car = await Car.findById(raw.car);
    if (!car) return fail({ message: 'خودرو یافت نشد' }, 404);

    const err = validateContract(data, { strict: wantSign });
    if (err) return fail({ message: err });

    const contract = await Contract.create({
      ...data,
      car: car._id,
      status: 'draft',
      number: await nextContractNumber(),
      history: [{ action: 'created' }],
    });

    if (wantSign) {
      try {
        await signContract(contract);
      } catch (e) {
        return fail({ message: `${e.message}\n(قرارداد به‌صورت پیش‌نویس ذخیره شد.)`, contractId: contract._id });
      }
    }
    return NextResponse.json(contract, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
