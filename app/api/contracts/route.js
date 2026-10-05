import { NextResponse } from 'next/server';
import { Car, Contract } from '@/lib/models';
import { connectDB, withTransaction } from '@/lib/db';
import { clean, fail } from '@/lib/crud';
import { normalizePayload, validateContract, nextContractNumber, signContract } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

// GET /api/contracts?status=signed&car=
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter = {};
    if (searchParams.get('status')) filter.status = searchParams.get('status');
    if (searchParams.get('car')) filter.car = searchParams.get('car');
    const list = await Contract.find(filter).select('-documents.key').sort({ createdAt: -1 }).populate('car', 'brand model year plate').lean();
    return NextResponse.json(list);
  } catch (e) {
    return fail(e, 500);
  }
}

// ثبت قولنامه
// status=draft  → فقط ذخیره، هیچ اثری روی دفتر چک/نقدینگی/خودرو ندارد
// status=signed → ساخت + امضا «اتمیک»: اگر هر مرحله خطا بدهد، هیچ چیز (حتی شماره قرارداد) ثبت نمی‌شود
export async function POST(req) {
  try {
    await connectDB();
    const raw = clean(await req.json());
    const wantSign = raw.status === 'signed';
    const data = normalizePayload(raw);

    const err = validateContract(data, { strict: wantSign });
    if (err) return fail({ message: err });

    const contract = await withTransaction(async (tx) => {
      const car = await Car.findById(raw.car).session(tx.session);
      if (!car) throw Object.assign(new Error('خودرو یافت نشد'), { status: 404 });
      const [c] = await Contract.create(
        [{ ...data, car: car._id, status: 'draft', number: await nextContractNumber(tx), history: [{ action: 'created' }] }],
        { session: tx.session || undefined }
      );
      if (wantSign) await signContract(c, tx);
      return c;
    });
    return NextResponse.json(contract, { status: 201 });
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
