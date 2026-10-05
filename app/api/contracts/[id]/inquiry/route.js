import { NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { runInquiry, inquiryEnabled } from '@/lib/inquiry';
import { INQUIRY_KINDS } from '@/lib/contractDocs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({ fines: inquiryEnabled('fines'), seizure: inquiryEnabled('seizure') });
}

// POST { kind: 'fines'|'seizure', manual?: { amount?, seized?, trackingCode?, note? } }
export async function POST(req, { params }) {
  try {
    await connectDB();
    const { kind, manual } = await req.json();
    if (!INQUIRY_KINDS[kind]) return fail({ message: 'نوع استعلام نامعتبر است.' });
    const c = await Contract.findById(params.id).populate('car');
    if (!c) return fail({ message: 'یافت نشد' }, 404);

    let entry;
    if (manual) {
      const amount = Number(manual.amount) || 0;
      const seized = !!manual.seized;
      entry = {
        kind,
        at: new Date(),
        ok: true,
        provider: 'manual',
        amount: kind === 'fines' ? amount : undefined,
        seized: kind === 'seizure' ? seized : undefined,
        trackingCode: manual.trackingCode,
        summary: kind === 'fines' ? (amount ? `${amount.toLocaleString('fa-IR')} ریال خلافی` : 'بدون خلافی') : seized ? 'توقیف/منع معامله دارد' : 'توقیف ندارد',
        note: manual.note,
      };
    } else {
      try {
        const r = await runInquiry(kind, { car: c.car, contract: c });
        entry = { kind, at: new Date(), ok: true, provider: r.provider, amount: r.amount, seized: r.seized, summary: r.summary, raw: r.raw };
      } catch (e) {
        entry = { kind, at: new Date(), ok: false, provider: 'api', summary: e.message };
      }
    }
    c.inquiries.push(entry);
    c.history.push({ at: new Date(), action: 'inquiry', note: `${INQUIRY_KINDS[kind]}: ${entry.summary}` });
    await c.save();
    if (!entry.ok) return fail({ message: entry.summary });
    return NextResponse.json(entry);
  } catch (e) {
    return fail(e);
  }
}
