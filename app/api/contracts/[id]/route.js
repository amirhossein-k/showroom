import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { clean, fail } from '@/lib/crud';
import { updateDraft } from '@/lib/contractService';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id).populate('car').lean();
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    return NextResponse.json(c);
  } catch (e) {
    return fail(e, 500);
  }
}

// ویرایش: پیش‌نویس کامل؛ امضاشده فقط یادداشت
export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id);
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    await updateDraft(c, clean(await req.json()));
    return NextResponse.json(c);
  } catch (e) {
    return fail(e);
  }
}

// حذف فقط برای پیش‌نویس و لغوشده (قرارداد امضاشده باید اول لغو شود تا سوابق مالی سالم بماند)
export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id);
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    if (c.status === 'signed') return fail({ message: 'قرارداد امضاشده را نمی‌توان حذف کرد؛ اول لغوش کن.' });
    await c.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
