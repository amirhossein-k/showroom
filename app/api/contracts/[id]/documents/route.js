import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Contract } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { putPrivate, deletePrivate } from '@/lib/privateStorage';
import { DOC_TYPES, DOC_MIME, DOC_MAX } from '@/lib/contractDocs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const publicDoc = ({ key, ...d }) => d;

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const c = await Contract.findById(params.id).select('documents').lean();
    if (!c) return fail({ message: 'یافت نشد' }, 404);
    return NextResponse.json((c.documents || []).map(publicDoc));
  } catch (e) {
    return fail(e, 500);
  }
}

// POST multipart: type, title?, files[]  — برای هر وضعیتی از قرارداد (حتی امضاشده) مجاز است
export async function POST(req, { params }) {
  const uploaded = [];
  try {
    await connectDB();
    const form = await req.formData();
    const type = DOC_TYPES[form.get('type')] ? form.get('type') : 'other';
    const title = String(form.get('title') || '').trim();
    const exists = await Contract.exists({ _id: params.id });
    if (!exists) return fail({ message: 'یافت نشد' }, 404);

    const docs = [];
    const skipped = [];
    for (const f of form.getAll('files')) {
      if (typeof f === 'string' || !f.size) continue;
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!DOC_MIME[ext]) { skipped.push(`${f.name}: فقط تصویر یا PDF`); continue; }
      if (f.size > DOC_MAX) { skipped.push(`${f.name}: بیشتر از ۴ مگابایت`); continue; }
      const key = `contracts/${params.id}/${type}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
      await putPrivate(key, Buffer.from(await f.arrayBuffer()), DOC_MIME[ext]);
      uploaded.push(key);
      docs.push({ type, title: title || DOC_TYPES[type].label, key, name: f.name, mime: DOC_MIME[ext], size: f.size, uploadedAt: new Date() });
    }
    if (!docs.length) return fail({ message: skipped.join('\n') || 'فایلی انتخاب نشده.' });

    const c = await Contract.findByIdAndUpdate(
      params.id,
      { $push: { documents: { $each: docs }, history: { at: new Date(), action: 'document', note: `${DOC_TYPES[type].label} (${docs.length})` } } },
      { new: true }
    ).lean();
    return NextResponse.json({ documents: (c.documents || []).map(publicDoc), skipped }, { status: 201 });
  } catch (e) {
    // اگر ثبت در دیتابیس شکست خورد، فایل‌های آپلودشده یتیم نمانند
    await Promise.all(uploaded.map((k) => deletePrivate(k).catch(() => {})));
    console.error('contract document upload', e);
    return fail(e);
  }
}
