import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { connectDB, withTransaction } from '@/lib/db';
import { clean, fail } from '@/lib/crud';
import { updateDraft } from '@/lib/contractService';
import { deletePrivate } from '@/lib/privateStorage';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id).select('-documents.key').populate('car').lean();
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    return NextResponse.json(c);
  } catch (e) {
    return fail(e, 500);
  }
}

// ویرایش: پیش‌نویس کامل؛ امضاشده فقط یادداشت/مدارک خودرو/تکمیل هویت
export async function PATCH(req, { params }) {
  try {
    const body = clean(await req.json());
    const c = await withTransaction(async (tx) => {
      const c = await Contract.findById(params.id).session(tx.session);
      if (!c) throw Object.assign(new Error('یافت نشد'), { status: 404 });
      await updateDraft(c, body, tx);
      return c;
    });
    return NextResponse.json(c);
  } catch (e) {
    return fail(e, e.status || 400);
  }
}

// حذف فقط برای پیش‌نویس و لغوشده
export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id);
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    if (c.status === 'signed') return fail({ message: 'قرارداد امضاشده را نمی‌توان حذف کرد؛ اول لغوش کن.' });
    const keys = (c.documents || []).map((d) => d.key).filter(Boolean);
    await c.deleteOne();
    await Promise.all(keys.map((k) => deletePrivate(k).catch(() => {})));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
