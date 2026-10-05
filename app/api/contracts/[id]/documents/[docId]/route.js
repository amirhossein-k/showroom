import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { getPrivate, deletePrivate } from '@/lib/privateStorage';
import { DOC_TYPES } from '@/lib/contractDocs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// دریافت فایل (فقط بعد از ورود؛ middleware از /api محافظت می‌کند)
export async function GET(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findOne({ _id: params.id, 'documents._id': params.docId }, { 'documents.$': 1 }).lean();
    const d = c?.documents?.[0];
    if (!d) return new Response('Not found', { status: 404 });
    const buf = await getPrivate(d.key);
    return new Response(buf, {
      headers: {
        'Content-Type': d.mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(d.name || 'document')}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return fail(e, 500);
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id);
    const d = c?.documents?.id(params.docId);
    if (!d) return fail({ message: 'یافت نشد' }, 404);
    const key = d.key;
    c.history.push({ at: new Date(), action: 'document', note: `حذف ${DOC_TYPES[d.type]?.label || d.type}` });
    d.deleteOne();
    await c.save();
    await deletePrivate(key).catch((e) => console.error('delete private file', e));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
