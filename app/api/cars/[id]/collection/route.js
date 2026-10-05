// [collections] پیگیری وصول، اعلام پرداخت خریدار و تطبیق با رسید بانکی برای یک خودرو
import { NextResponse } from 'next/server';
import { Car, Cheque, Contract, Customer, Transaction } from '@/lib/models';
import { withTransaction } from '@/lib/db';
import { fail } from '@/lib/crud';
import { setPaymentStatus } from '@/lib/contractService';
import { CONTACT_RESULTS, CONTACT_CHANNELS } from '@/lib/collections';
import { TX_METHODS, SOLD_STATUSES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ID = /^[a-f\d]{24}$/i;
const bad = (m, status = 400) => {
  throw Object.assign(new Error(m), { status });
};
const text = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const toEn = (v) => String(v || '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const ref = (v) => toEn(text(v, 80)).replace(/\s+/g, '');
const date = (v, label, { required = false } = {}) => {
  if (v === null || v === undefined || v === '') {
    if (required) bad(`${label} را وارد کن.`);
    return null;
  }
  if (typeof v !== 'string' || !Number.isFinite(Date.parse(v))) bad(`${label} معتبر نیست.`);
  return new Date(v);
};
const amount = (v) => {
  if (!Number.isSafeInteger(v) || v <= 0) bad('مبلغ باید عدد صحیح مثبت به تومان باشد.');
  return v;
};
const id = (v, label) => {
  if (typeof v !== 'string' || !ID.test(v)) bad(`${label} نامعتبر است.`);
  return v;
};
const opt = (tx) => ({ session: tx.session || undefined });

/** یک کد پیگیری بانکی فقط یک بار می‌تواند وصول حساب شود (جلوگیری از دوباره‌شماری) */
async function assertUniqueRef(bankRef, tx, exceptId) {
  if (!bankRef) return;
  const q = { bankRef, direction: 'in' };
  if (exceptId) q._id = { $ne: exceptId };
  const dup = await Transaction.findOne(q).session(tx.session || null).lean();
  if (dup) bad(`کد پیگیری ${bankRef} قبلاً برای دریافت دیگری (${dup.party || 'بدون نام'}) تأیید شده است.`, 409);
}

function verifyFields(body, method) {
  const bankRef = ref(body.bankRef);
  const bankDate = date(body.bankDate, 'تاریخ نشستن پول در حساب');
  if (method !== 'cash' && !bankRef) bad('برای تأیید واریز غیرنقدی، کد پیگیری یا شماره مرجع صورت‌حساب بانک لازم است.');
  return { verified: true, verifiedAt: new Date(), bankRef: bankRef || undefined, bankDate: bankDate || undefined };
}

async function run(car, body, tx) {
  const r = (car.receivable ||= {});
  r.log ||= [];
  r.claims ||= [];
  const action = body.action;

  if (action === 'schedule') {
    if ('dueDate' in body) r.dueDate = date(body.dueDate, 'سررسید پرداخت') || undefined;
    if ('nextFollowUp' in body) r.nextFollowUp = date(body.nextFollowUp, 'تاریخ پیگیری بعدی') || undefined;
    return { car };
  }

  if (action === 'contact') {
    const at = date(body.at, 'تاریخ تماس') || new Date();
    const result = Object.prototype.hasOwnProperty.call(CONTACT_RESULTS, body.result) ? body.result : 'other';
    const channel = Object.prototype.hasOwnProperty.call(CONTACT_CHANNELS, body.channel) ? body.channel : 'phone';
    const promisedDate = date(body.promisedDate, 'تاریخ قول پرداخت');
    const next = date(body.nextFollowUp, 'تاریخ پیگیری بعدی');
    const note = text(body.note);
    if (!note && result === 'other') bad('نتیجه تماس یا یک توضیح کوتاه بنویس.');
    r.log.push({ at, channel, result, note, promisedDate: promisedDate || undefined });
    if (!r.lastContactAt || at > new Date(r.lastContactAt)) r.lastContactAt = at;
    if (next || promisedDate) r.nextFollowUp = next || promisedDate;
    if (car.buyer) await Customer.findByIdAndUpdate(car.buyer, { $set: { lastContact: at } }, opt(tx));
    return { car };
  }

  if (action === 'claim') {
    const method = Object.prototype.hasOwnProperty.call(TX_METHODS, body.method) ? body.method : 'transfer';
    r.claims.push({
      amount: amount(body.amount),
      claimedAt: new Date(),
      paidDate: date(body.paidDate, 'تاریخ واریز اعلام‌شده') || undefined,
      method,
      reference: ref(body.reference),
      note: text(body.note),
      status: 'claimed',
    });
    r.log.push({ at: new Date(), channel: 'phone', result: 'claimed_paid', note: `اعلام پرداخت ${body.amount.toLocaleString('en-US')} تومان${body.reference ? ' · کد ' + ref(body.reference) : ''}` });
    r.lastContactAt = new Date();
    return { car };
  }

  if (action === 'verify-claim' || action === 'reject-claim') {
    const claim = r.claims.id(id(body.claimId, 'اعلام پرداخت'));
    if (!claim) bad('اعلام پرداخت یافت نشد.', 404);
    if (claim.status !== 'claimed') bad('این اعلام پرداخت قبلاً بررسی شده است.', 409);
    if (action === 'reject-claim') {
      claim.status = 'rejected';
      claim.resolvedAt = new Date();
      claim.resolveNote = text(body.note) || 'در صورت‌حساب بانک پیدا نشد';
      return { car };
    }
    const method = Object.prototype.hasOwnProperty.call(TX_METHODS, body.method) ? body.method : claim.method || 'transfer';
    const verify = verifyFields(body, method);
    await assertUniqueRef(verify.bankRef, tx);
    const contract = await Contract.findOne({ car: car._id, status: 'signed' }).session(tx.session || null);
    let t;
    if (contract) {
      // خودروی دارای قولنامه: دریافت باید روی همان ردیف قولنامه بنشیند تا ثبت موازی ایجاد نشود
      const p = contract.payments.id(id(body.paymentId, 'ردیف پرداخت قولنامه'));
      if (!p) bad('ردیف پرداخت قولنامه یافت نشد.', 404);
      if (p.kind === 'cheque') bad('ردیف چکی از دفتر چک تأیید می‌شود، نه از اعلام پرداخت.');
      if ((p.status || (p.paid ? 'paid' : 'pending')) !== 'pending') bad('این ردیف قولنامه قبلاً پرداخت‌شده یا برگشتی است.');
      if (p.amount !== claim.amount) bad(`مبلغ اعلام‌شده (${claim.amount.toLocaleString('en-US')}) با ردیف قولنامه (${p.amount.toLocaleString('en-US')}) برابر نیست. اگر خریدار بخشی را داده، ابتدا ردیف‌های قولنامه را اصلاح کن.`);
      await setPaymentStatus(contract, p._id, 'paid', verify.bankDate || claim.paidDate || new Date(), tx);
      t = await Transaction.findByIdAndUpdate(p.transaction, { $set: { ...verify, method } }, { new: true, ...opt(tx) });
    } else {
      [t] = await Transaction.create(
        [
          {
            car: car._id,
            direction: 'in',
            category: 'sale',
            method,
            amount: claim.amount,
            date: verify.bankDate || claim.paidDate || new Date(),
            party: car.buyerName || '',
            note: `دریافت تأییدشده با رسید بانکی${claim.reference ? ' · کد اعلامی خریدار ' + claim.reference : ''}${claim.note ? ' · ' + claim.note : ''}`,
            ...verify,
          },
        ],
        opt(tx)
      );
    }
    claim.status = 'verified';
    claim.resolvedAt = new Date();
    claim.transaction = t?._id;
    claim.resolveNote = text(body.note);
    return { car, transaction: t };
  }

  if (action === 'verify-tx' || action === 'unverify-tx') {
    const t = await Transaction.findOne({ _id: id(body.txId, 'تراکنش'), car: car._id }).session(tx.session || null);
    if (!t) bad('تراکنش این خودرو یافت نشد.', 404);
    if (t.direction !== 'in') bad('فقط دریافت‌ها با رسید بانکی تطبیق داده می‌شوند.');
    if (action === 'unverify-tx') {
      t.verified = false;
      t.verifiedAt = undefined;
      t.bankRef = undefined;
      t.bankDate = undefined;
    } else {
      const verify = verifyFields(body, t.method);
      await assertUniqueRef(verify.bankRef, tx, t._id);
      Object.assign(t, verify);
    }
    await t.save(opt(tx));
    return { car, transaction: t, carUnchanged: true };
  }

  if (action === 'record-cheque') {
    const q = await Cheque.findOne({ _id: id(body.chequeId, 'چک'), car: car._id }).session(tx.session || null);
    if (!q) bad('چک این خودرو یافت نشد.', 404);
    if (q.direction !== 'received' || q.status !== 'cleared') bad('فقط چک دریافتیِ «وصول/پاس شد» قابل ثبت به‌عنوان دریافت است.');
    if (await Transaction.exists({ cheque: q._id }).session(tx.session || null)) bad('برای این چک قبلاً دریافت ثبت شده است.', 409);
    const bankRef = ref(body.bankRef) || toEn(q.sayadId || q.number || '') || undefined;
    const bankDate = date(body.bankDate, 'تاریخ وصول چک') || q.dueDate;
    if (body.txId) {
      // دریافت این چک قبلاً دستی ثبت شده؛ فقط اتصال و تأیید
      const t = await Transaction.findOne({ _id: id(body.txId, 'تراکنش'), car: car._id, direction: 'in', category: 'sale' }).session(tx.session || null);
      if (!t) bad('تراکنش انتخاب‌شده یافت نشد.', 404);
      if (t.cheque) bad('این تراکنش به چک دیگری وصل است.', 409);
      if (t.amount !== q.amount) bad('مبلغ تراکنش با مبلغ چک برابر نیست.');
      await assertUniqueRef(bankRef, tx, t._id);
      Object.assign(t, { cheque: q._id, verified: true, verifiedAt: new Date(), bankRef, bankDate });
      await t.save(opt(tx));
      return { car, transaction: t, carUnchanged: true };
    }
    await assertUniqueRef(bankRef, tx);
    const [t] = await Transaction.create(
      [
        {
          car: car._id,
          contract: q.contract || undefined,
          cheque: q._id,
          source: 'cheque',
          direction: 'in',
          category: 'sale',
          method: 'cheque',
          amount: q.amount,
          date: bankDate,
          party: q.party || car.buyerName || '',
          note: `وصول چک ${q.number || ''} ${q.bank || ''}`.trim(),
          verified: true,
          verifiedAt: new Date(),
          bankRef,
          bankDate,
        },
      ],
      opt(tx)
    );
    return { car, transaction: t, carUnchanged: true };
  }

  bad('عملیات نامعتبر است.');
}

export async function POST(req, { params }) {
  try {
    if (!ID.test(params.id)) return fail({ message: 'خودرو نامعتبر است.' }, 400);
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail({ message: 'درخواست نامعتبر است.' });
    const out = await withTransaction(async (tx) => {
      const car = await Car.findById(params.id).session(tx.session || null);
      if (!car) bad('خودرو یافت نشد.', 404);
      if (!SOLD_STATUSES.includes(car.status) && body.action !== 'verify-tx' && body.action !== 'unverify-tx')
        bad('پیگیری وصول فقط برای خودروی فروخته‌شده یا منتظر انتقال سند فعال است.');
      const res = await run(car, body, tx);
      if (!res.carUnchanged) {
        car.markModified('receivable');
        await car.save(opt(tx));
      }
      return { ok: true, receivable: car.receivable, transaction: res.transaction || null };
    });
    return NextResponse.json(out);
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
