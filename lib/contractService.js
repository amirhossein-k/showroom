// منطق کسب‌وکار قولنامه — همه اثرات جانبی (دفتر چک، نقدینگی، وضعیت خودرو) فقط از اینجا انجام می‌شود
// [v2] همه توابعِ نویسنده یک tx = { session, after } می‌گیرند و باید داخل withTransaction صدا زده شوند.
import { Car, Contract, Cheque, Transaction, Customer, Counter } from './models';
import { toJalali } from './jalali';
import { getSettings } from './settings';
import { markSoldInChannel } from './telegramExtra';
import { formatNumber, formatDate, toEnDigits } from './persian';
import { isValidNationalId, paymentStatus, PAYMENT_TO_CHEQUE, CHEQUE_TO_PAYMENT } from './contractDefaults';

const EDITABLE = ['customer', 'seller', 'buyer', 'place', 'date', 'totalPrice', 'payments', 'deliveryDate', 'transferDate', 'penaltyPerDay', 'terms', 'witnesses', 'notes', 'carDocs'];
const IDENTITY_EXTRA = ['birthCertNo', 'birthDate', 'issuePlace'];
const NO_TX = { session: null, after: [] };

export class ContractError extends Error {}
const bad = (m) => {
  throw new ContractError(m);
};
const opt = (tx) => ({ session: tx?.session || undefined });

/** شماره قرارداد اتمیک: ۱۴۰۵-۰۰۰۱ (داخل تراکنش: اگر عملیات شکست بخورد شماره هم مصرف نمی‌شود) */
export async function nextContractNumber(tx = NO_TX) {
  const jy = toJalali(new Date()).jy;
  const key = `contract-${jy}`;
  let c = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { new: true, upsert: true, ...opt(tx) });
  if (c.seq === 1) {
    const existing = await Contract.countDocuments({ number: new RegExp(`^${jy}-`) }).session(tx.session || null);
    if (existing) c = await Counter.findOneAndUpdate({ key }, { $set: { seq: existing + 1 } }, { new: true, ...opt(tx) });
  }
  return `${jy}-${String(c.seq).padStart(4, '0')}`;
}

const digits = (v) => toEnDigits(v || '').trim();
const cleanParty = (p = {}) => ({
  name: (p.name || '').trim(),
  fatherName: (p.fatherName || '').trim(),
  nationalId: digits(p.nationalId),
  phone: digits(p.phone),
  address: (p.address || '').trim(),
  birthCertNo: digits(p.birthCertNo),
  birthDate: p.birthDate || undefined,
  issuePlace: (p.issuePlace || '').trim(),
});

const cleanCarDocs = (d = {}) => ({
  cardNo: digits(d.cardNo),
  documentNo: digits(d.documentNo),
  insurer: (d.insurer || '').trim(),
  insurancePolicyNo: digits(d.insurancePolicyNo),
  insuranceExpiry: d.insuranceExpiry || undefined,
  insuranceDiscountYears: Number(d.insuranceDiscountYears) || 0,
});

/** یکدست‌سازی ورودی فرم */
export function normalizePayload(body = {}) {
  const out = {};
  for (const k of EDITABLE) if (body[k] !== undefined) out[k] = body[k];
  if (out.customer === '') out.customer = undefined;
  if (out.seller) out.seller = cleanParty(out.seller);
  if (out.buyer) out.buyer = cleanParty(out.buyer);
  if (out.carDocs) out.carDocs = cleanCarDocs(out.carDocs);
  if (out.totalPrice !== undefined) out.totalPrice = Number(out.totalPrice) || 0;
  if (out.penaltyPerDay !== undefined) out.penaltyPerDay = Number(out.penaltyPerDay) || 0;
  if (out.terms) out.terms = out.terms.map((t) => String(t).trim()).filter(Boolean);
  if (out.witnesses)
    out.witnesses = out.witnesses
      .map(cleanParty)
      .filter((w) => w.name)
      .map(({ name, fatherName, nationalId, phone }) => ({ name, fatherName, nationalId, phone }));
  if (out.payments) {
    out.payments = out.payments
      .filter((p) => Number(p.amount) > 0)
      .map((p) => {
        const status = paymentStatus(p);
        return {
          ...(p._id ? { _id: p._id } : {}),
          kind: ['cash', 'transfer', 'cheque'].includes(p.kind) ? p.kind : 'cheque',
          amount: Number(p.amount),
          dueDate: p.dueDate || null,
          bank: p.bank,
          number: digits(p.number),
          sayadId: digits(p.sayadId),
          status,
          paid: status === 'paid',
          paidAt: status === 'paid' ? p.paidAt || p.dueDate || new Date() : undefined,
          note: p.note,
        };
      });
  }
  return out;
}

/** اعتبارسنجی؛ strict=true برای امضا */
export function validateContract(c, { strict = false } = {}) {
  const errs = [];
  if (!(Number(c.totalPrice) > 0)) errs.push('مبلغ کل قرارداد را وارد کن.');
  const payments = c.payments || [];
  if (!payments.length) errs.push('حداقل یک ردیف پرداخت لازم است.');
  const sum = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
  if (payments.length && Math.abs(sum - Number(c.totalPrice)) > 1)
    errs.push(`جمع پرداخت‌ها (${formatNumber(sum)}) با مبلغ کل (${formatNumber(c.totalPrice)}) برابر نیست.`);
  payments.forEach((p, i) => {
    if (p.kind === 'cheque' && !p.dueDate) errs.push(`سررسید چک ردیف ${i + 1} مشخص نیست.`);
  });
  if (!c.buyer?.name) errs.push('نام خریدار الزامی است.');
  if (c.buyer?.nationalId && !isValidNationalId(c.buyer.nationalId)) errs.push('کد ملی خریدار معتبر نیست.');
  if (c.seller?.nationalId && !isValidNationalId(c.seller.nationalId)) errs.push('کد ملی فروشنده معتبر نیست.');
  for (const [who, p] of [['خریدار', c.buyer], ['فروشنده', c.seller]]) {
    if (p?.birthCertNo && !/^\d{1,10}$/.test(digits(p.birthCertNo))) errs.push(`شماره شناسنامه ${who} باید فقط عدد باشد.`);
    if (p?.birthDate && new Date(p.birthDate) > new Date()) errs.push(`تاریخ تولد ${who} نمی‌تواند در آینده باشد.`);
  }
  if (c.carDocs?.insurancePolicyNo && !/^\d{4,30}$/.test(digits(c.carDocs.insurancePolicyNo))) errs.push('شماره بیمه‌نامه معتبر نیست.');

  if (strict) {
    if (!c.seller?.name) errs.push('نام فروشنده الزامی است.');
    if (!c.buyer?.nationalId) errs.push('برای امضا، کد ملی خریدار الزامی است.');
    if (!c.seller?.nationalId) errs.push('برای امضا، کد ملی فروشنده الزامی است.');
    if (!c.deliveryDate) errs.push('تاریخ تحویل خودرو را مشخص کن.');
    if (!c.transferDate) errs.push('تاریخ حضور در دفترخانه را مشخص کن.');
    if (c.transferDate && c.date && new Date(c.transferDate) < new Date(c.date)) errs.push('تاریخ انتقال سند نمی‌تواند قبل از تاریخ قرارداد باشد.');
    payments.forEach((p, i) => {
      if (p.kind === 'cheque' && !p.number && !p.sayadId) errs.push(`شماره یا شناسه صیادی چک ردیف ${i + 1} را وارد کن.`);
    });
  }
  return errs.length ? errs.join('\n') : null;
}

const log = (contract, action, note) => {
  contract.history = contract.history || [];
  contract.history.push({ at: new Date(), action, note });
};

async function createTx(contract, p, carId, tx) {
  const [t] = await Transaction.create(
    [
      {
        car: carId,
        contract: contract._id,
        direction: 'in',
        category: 'sale',
        method: p.kind === 'cash' ? 'cash' : 'transfer',
        amount: p.amount,
        date: p.paidAt || p.dueDate || contract.date,
        party: contract.buyer?.name,
        note: `قولنامه ${contract.number}`,
      },
    ],
    opt(tx)
  );
  p.transaction = t._id;
}

/** امضا: ساخت چک‌ها در دفتر چک + ثبت دریافتی‌ها + تغییر وضعیت خودرو — همه در یک تراکنش */
export async function signContract(contract, tx = NO_TX) {
  if (contract.status === 'signed') bad('این قرارداد قبلاً امضا شده.');
  if (contract.status === 'cancelled') bad('قرارداد لغوشده را نمی‌توان امضا کرد.');
  const err = validateContract(contract.toObject ? contract.toObject() : contract, { strict: true });
  if (err) bad(err);

  const car = await Car.findById(contract.car).session(tx.session || null);
  if (!car) bad('خودرو یافت نشد.');
  const other = await Contract.findOne({ car: car._id, status: 'signed', _id: { $ne: contract._id } })
    .session(tx.session || null)
    .lean();
  if (other) bad(`برای این خودرو قبلاً قولنامه امضاشده (شماره ${other.number}) وجود دارد. اول آن را لغو کن.`);

  for (const p of contract.payments) {
    const st = paymentStatus(p);
    if (p.kind === 'cheque') {
      if (!p.cheque) {
        const [q] = await Cheque.create(
          [
            {
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
              status: PAYMENT_TO_CHEQUE[st] || 'pending',
              note: `قولنامه ${contract.number}`,
            },
          ],
          opt(tx)
        );
        p.cheque = q._id;
      }
    } else if (st === 'paid' && !p.transaction) {
      await createTx(contract, p, car._id, tx);
    }
  }

  contract.status = 'signed';
  contract.signedAt = new Date();
  log(contract, 'signed');
  await contract.save(opt(tx));

  car.salePrice = contract.totalPrice;
  car.saleDate = contract.date;
  car.buyerName = contract.buyer?.name;
  if (contract.customer) car.buyer = contract.customer;
  car.status = contract.transferredAt ? 'sold' : 'awaiting_transfer';
  await car.save(opt(tx));
  if (contract.customer) await Customer.findByIdAndUpdate(contract.customer, { $set: { status: 'won' } }, opt(tx));

  // تلگرام بیرون از دیتابیس است → فقط بعد از commit
  if (car.channelPost?.messageId && !car.channelPost.soldMarked) {
    const snapshot = car.toObject();
    tx.after.push(async () => {
      const r = await markSoldInChannel(snapshot, await getSettings());
      if (r?.ok) await Car.updateOne({ _id: snapshot._id }, { $set: { 'channelPost.soldMarked': true } });
    });
  }
  return contract;
}

/** لغو: باطل کردن چک‌های در جریان + برگشت خودرو به موجودی + (اختیاری) ثبت استرداد وجه */
export async function cancelContract(contract, { reason, refund = false } = {}, tx = NO_TX) {
  if (contract.status === 'cancelled') bad('این قرارداد قبلاً لغو شده.');
  const wasSigned = contract.status === 'signed';

  if (wasSigned) {
    await Cheque.updateMany(
      { contract: contract._id, status: 'pending' },
      { $set: { status: 'cancelled', note: `عودت — لغو قولنامه ${contract.number}` } },
      opt(tx)
    );
    if (refund) {
      const paid = contract.payments.filter((p) => paymentStatus(p) === 'paid').reduce((a, p) => a + p.amount, 0);
      if (paid > 0)
        await Transaction.create(
          [
            {
              car: contract.car,
              contract: contract._id,
              direction: 'out',
              category: 'sale',
              method: 'transfer',
              amount: paid,
              date: new Date(),
              party: contract.buyer?.name,
              note: `استرداد وجه — لغو قولنامه ${contract.number}`,
            },
          ],
          opt(tx)
        );
    }
    const car = await Car.findById(contract.car).session(tx.session || null);
    if (car && ['awaiting_transfer', 'sold'].includes(car.status)) {
      car.status = 'available';
      car.salePrice = undefined;
      car.saleDate = undefined;
      car.buyerName = undefined;
      car.buyer = undefined;
      await car.save(opt(tx));
    }
  }
  contract.status = 'cancelled';
  contract.cancelledAt = new Date();
  contract.cancelReason = reason;
  log(contract, 'cancelled', reason);
  await contract.save(opt(tx));
  return contract;
}

export async function markDelivered(contract, date, tx = NO_TX) {
  if (contract.status !== 'signed') bad('فقط قرارداد امضاشده قابل تحویل است.');
  contract.deliveredAt = date || new Date();
  log(contract, 'delivered', formatDate(contract.deliveredAt));
  await contract.save(opt(tx));
  return contract;
}

export async function markTransferred(contract, date, tx = NO_TX) {
  if (contract.status !== 'signed') bad('فقط قرارداد امضاشده قابل انتقال سند است.');
  contract.transferredAt = date || new Date();
  log(contract, 'transferred', formatDate(contract.transferredAt));
  await contract.save(opt(tx));
  await Car.findByIdAndUpdate(contract.car, { $set: { status: 'sold' } }, opt(tx));
  return contract;
}

/** تغییر وضعیت یک قسط (و همگام‌سازی با دفتر چک / نقدینگی) */
export async function setPaymentStatus(contract, pid, status, paidAt, tx = NO_TX) {
  if (!['pending', 'paid', 'bounced'].includes(status)) bad('وضعیت نامعتبر است.');
  const p = contract.payments.id(pid);
  if (!p) bad('ردیف پرداخت یافت نشد.');
  if (status === 'bounced' && p.kind !== 'cheque') bad('فقط چک می‌تواند برگشتی باشد.');

  if (contract.status === 'signed') {
    if (p.kind === 'cheque') {
      if (p.cheque) await Cheque.findByIdAndUpdate(p.cheque, { $set: { status: PAYMENT_TO_CHEQUE[status] } }, opt(tx));
    } else if (status === 'paid' && !p.transaction) {
      p.paidAt = paidAt || new Date();
      await createTx(contract, p, contract.car?._id || contract.car, tx);
    } else if (status !== 'paid' && p.transaction) {
      await Transaction.findByIdAndDelete(p.transaction, opt(tx));
      p.transaction = undefined;
    }
  }
  p.status = status;
  p.paid = status === 'paid';
  p.paidAt = status === 'paid' ? paidAt || p.paidAt || new Date() : undefined;
  log(contract, 'payment', `ردیف ${contract.payments.indexOf(p) + 1}: ${status}`);
  await contract.save(opt(tx));
  return contract;
}

/** وقتی وضعیت چک از «دفتر چک» عوض شد، قسط قرارداد هم به‌روز شود */
export async function syncFromCheque(cheque, tx = NO_TX) {
  if (!cheque?.contract) return;
  const c = await Contract.findById(cheque.contract).session(tx.session || null);
  if (!c) return;
  const p = c.payments.find((x) => String(x.cheque) === String(cheque._id));
  if (!p) return;
  const st = CHEQUE_TO_PAYMENT[cheque.status] || 'pending';
  if (paymentStatus(p) === st) return;
  p.status = st;
  p.paid = st === 'paid';
  p.paidAt = st === 'paid' ? new Date() : undefined;
  log(c, 'payment', `همگام با دفتر چک: ${cheque.number || ''}`);
  await c.save(opt(tx));
}

/**
 * ویرایش
 * - پیش‌نویس: همه فیلدها
 * - امضاشده/لغوشده: یادداشت + مدارک خودرو (carDocs) + «تکمیل» اطلاعات هویتی خالی (بازنویسی مقدار موجود ممنوع)
 */
export async function updateDraft(contract, body, tx = NO_TX) {
  if (contract.status !== 'draft') {
    let touched = false;
    if (body.notes !== undefined) {
      contract.notes = body.notes;
      touched = true;
    }
    if (body.carDocs) {
      contract.carDocs = { ...(contract.carDocs?.toObject?.() || contract.carDocs || {}), ...cleanCarDocs(body.carDocs) };
      touched = true;
    }
    for (const side of ['buyer', 'seller']) {
      if (!body[side]) continue;
      const incoming = cleanParty(body[side]);
      for (const k of IDENTITY_EXTRA) {
        if (incoming[k] && !contract[side]?.[k]) {
          contract.set(`${side}.${k}`, incoming[k]);
          touched = true;
        }
      }
    }
    if (!touched) bad('قرارداد امضاشده/لغوشده قابل ویرایش نیست؛ فقط یادداشت، مدارک خودرو و تکمیل اطلاعات هویتی خالی.');
    const err = validateContract(contract.toObject());
    if (err) bad(err);
    log(contract, 'edited', 'تکمیل اطلاعات');
    await contract.save(opt(tx));
    return contract;
  }
  const data = normalizePayload(body);
  const merged = { ...contract.toObject(), ...data };
  const err = validateContract(merged);
  if (err) bad(err);
  Object.assign(contract, data);
  log(contract, 'edited');
  await contract.save(opt(tx));
  return contract;
}

/** ساخت پیش‌نویس جدید از روی یک قرارداد (مثلاً بعد از لغو) — بدون اتصال به چک/تراکنش قبلی */
export async function duplicateAsDraft(source, tx = NO_TX) {
  const s = source.toObject ? source.toObject() : source;
  const [c] = await Contract.create(
    [
      {
        car: s.car?._id || s.car,
        customer: s.customer,
        seller: s.seller,
        buyer: s.buyer,
        place: s.place,
        date: new Date(),
        totalPrice: s.totalPrice,
        payments: (s.payments || []).map(({ _id, cheque, transaction, status, paid, paidAt, ...p }) => ({ ...p, status: 'pending', paid: false })),
        deliveryDate: s.deliveryDate,
        transferDate: s.transferDate,
        penaltyPerDay: s.penaltyPerDay,
        terms: s.terms,
        witnesses: s.witnesses,
        carDocs: s.carDocs,
        notes: s.notes,
        status: 'draft',
        number: await nextContractNumber(tx),
        history: [{ action: 'created', note: `کپی از قرارداد ${s.number}` }],
      },
    ],
    opt(tx)
  );
  return c;
}
