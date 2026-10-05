// منطق کسب‌وکار قولنامه — همه اثرات جانبی (دفتر چک، نقدینگی، وضعیت خودرو) فقط از اینجا انجام می‌شود
import { Car, Contract, Cheque, Transaction, Customer, Counter } from './models';
import { toJalali } from './jalali';
import { getSettings } from './settings';
import { markSoldInChannel } from './telegramExtra';
import { formatNumber, formatDate, toEnDigits } from './persian';
import { isValidNationalId, paymentStatus, PAYMENT_TO_CHEQUE, CHEQUE_TO_PAYMENT } from './contractDefaults';

const EDITABLE = ['customer', 'seller', 'buyer', 'place', 'date', 'totalPrice', 'payments', 'deliveryDate', 'transferDate', 'penaltyPerDay', 'terms', 'witnesses', 'notes'];

export class ContractError extends Error {}
const bad = (m) => {
  throw new ContractError(m);
};

/** شماره قرارداد اتمیک: ۱۴۰۵-۰۰۰۱ */
export async function nextContractNumber() {
  const jy = toJalali(new Date()).jy;
  const key = `contract-${jy}`;
  let c = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  if (c.seq === 1) {
    // اولین بار: با قراردادهای قدیمی همگام شو تا شماره تکراری نشود
    const existing = await Contract.countDocuments({ number: new RegExp(`^${jy}-`) });
    if (existing) c = await Counter.findOneAndUpdate({ key }, { $set: { seq: existing + 1 } }, { new: true });
  }
  return `${jy}-${String(c.seq).padStart(4, '0')}`;
}

const cleanParty = (p = {}) => ({
  name: (p.name || '').trim(),
  fatherName: (p.fatherName || '').trim(),
  nationalId: toEnDigits(p.nationalId || '').trim(),
  phone: toEnDigits(p.phone || '').trim(),
  address: (p.address || '').trim(),
});

/** یکدست‌سازی ورودی فرم */
export function normalizePayload(body = {}) {
  const out = {};
  for (const k of EDITABLE) if (body[k] !== undefined) out[k] = body[k];
  if (out.customer === '') out.customer = undefined;
  if (out.seller) out.seller = cleanParty(out.seller);
  if (out.buyer) out.buyer = cleanParty(out.buyer);
  if (out.totalPrice !== undefined) out.totalPrice = Number(out.totalPrice) || 0;
  if (out.penaltyPerDay !== undefined) out.penaltyPerDay = Number(out.penaltyPerDay) || 0;
  if (out.terms) out.terms = out.terms.map((t) => String(t).trim()).filter(Boolean);
  if (out.witnesses) out.witnesses = out.witnesses.map(cleanParty).filter((w) => w.name).map(({ address, ...w }) => w);
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
          number: toEnDigits(p.number || ''),
          sayadId: toEnDigits(p.sayadId || ''),
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

async function createTx(contract, p, carId) {
  const t = await Transaction.create({
    car: carId,
    contract: contract._id,
    direction: 'in',
    category: 'sale',
    method: p.kind === 'cash' ? 'cash' : 'transfer',
    amount: p.amount,
    date: p.paidAt || p.dueDate || contract.date,
    party: contract.buyer?.name,
    note: `قولنامه ${contract.number}`,
  });
  p.transaction = t._id;
}

/** امضا: ساخت چک‌ها در دفتر چک + ثبت دریافتی‌ها + تغییر وضعیت خودرو */
export async function signContract(contract) {
  if (contract.status === 'signed') bad('این قرارداد قبلاً امضا شده.');
  if (contract.status === 'cancelled') bad('قرارداد لغوشده را نمی‌توان امضا کرد.');
  const err = validateContract(contract.toObject ? contract.toObject() : contract, { strict: true });
  if (err) bad(err);

  const car = await Car.findById(contract.car);
  if (!car) bad('خودرو یافت نشد.');
  const other = await Contract.findOne({ car: car._id, status: 'signed', _id: { $ne: contract._id } }).lean();
  if (other) bad(`برای این خودرو قبلاً قولنامه امضاشده (شماره ${other.number}) وجود دارد. اول آن را لغو کن.`);

  for (const p of contract.payments) {
    const st = paymentStatus(p);
    if (p.kind === 'cheque') {
      if (!p.cheque) {
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
          status: PAYMENT_TO_CHEQUE[st] || 'pending',
          note: `قولنامه ${contract.number}`,
        });
        p.cheque = q._id;
      }
    } else if (st === 'paid' && !p.transaction) {
      await createTx(contract, p, car._id);
    }
  }

  contract.status = 'signed';
  contract.signedAt = new Date();
  log(contract, 'signed');
  await contract.save();

  car.salePrice = contract.totalPrice;
  car.saleDate = contract.date;
  car.buyerName = contract.buyer?.name;
  if (contract.customer) car.buyer = contract.customer;
  car.status = contract.transferredAt ? 'sold' : 'awaiting_transfer';
  if (car.channelPost?.messageId && !car.channelPost.soldMarked) {
    try {
      const r = await markSoldInChannel(car.toObject(), await getSettings());
      if (r?.ok) {
        car.channelPost.soldMarked = true;
        car.markModified('channelPost');
      }
    } catch {}
  }
  await car.save();
  if (contract.customer) await Customer.findByIdAndUpdate(contract.customer, { $set: { status: 'won' } });
  return contract;
}

/** لغو: باطل کردن چک‌های در جریان + برگشت خودرو به موجودی + (اختیاری) ثبت استرداد وجه */
export async function cancelContract(contract, { reason, refund = false } = {}) {
  if (contract.status === 'cancelled') bad('این قرارداد قبلاً لغو شده.');
  const wasSigned = contract.status === 'signed';

  if (wasSigned) {
    await Cheque.updateMany(
      { contract: contract._id, status: 'pending' },
      { $set: { status: 'cancelled', note: `عودت — لغو قولنامه ${contract.number}` } }
    );
    if (refund) {
      const paid = contract.payments.filter((p) => paymentStatus(p) === 'paid').reduce((a, p) => a + p.amount, 0);
      if (paid > 0)
        await Transaction.create({
          car: contract.car,
          contract: contract._id,
          direction: 'out',
          category: 'sale',
          method: 'transfer',
          amount: paid,
          date: new Date(),
          party: contract.buyer?.name,
          note: `استرداد وجه — لغو قولنامه ${contract.number}`,
        });
    }
    const car = await Car.findById(contract.car);
    if (car && ['awaiting_transfer', 'sold'].includes(car.status)) {
      car.status = 'available';
      car.salePrice = undefined;
      car.saleDate = undefined;
      car.buyerName = undefined;
      car.buyer = undefined;
      await car.save();
    }
  }
  contract.status = 'cancelled';
  contract.cancelledAt = new Date();
  contract.cancelReason = reason;
  log(contract, 'cancelled', reason);
  await contract.save();
  return contract;
}

export async function markDelivered(contract, date) {
  if (contract.status !== 'signed') bad('فقط قرارداد امضاشده قابل تحویل است.');
  contract.deliveredAt = date || new Date();
  log(contract, 'delivered', formatDate(contract.deliveredAt));
  await contract.save();
  return contract;
}

export async function markTransferred(contract, date) {
  if (contract.status !== 'signed') bad('فقط قرارداد امضاشده قابل انتقال سند است.');
  contract.transferredAt = date || new Date();
  log(contract, 'transferred', formatDate(contract.transferredAt));
  await contract.save();
  await Car.findByIdAndUpdate(contract.car, { $set: { status: 'sold' } });
  return contract;
}

/** تغییر وضعیت یک قسط (و همگام‌سازی با دفتر چک / نقدینگی) */
export async function setPaymentStatus(contract, pid, status, paidAt) {
  if (!['pending', 'paid', 'bounced'].includes(status)) bad('وضعیت نامعتبر است.');
  const p = contract.payments.id(pid);
  if (!p) bad('ردیف پرداخت یافت نشد.');
  if (status === 'bounced' && p.kind !== 'cheque') bad('فقط چک می‌تواند برگشتی باشد.');

  if (contract.status === 'signed') {
    if (p.kind === 'cheque') {
      if (p.cheque) await Cheque.findByIdAndUpdate(p.cheque, { $set: { status: PAYMENT_TO_CHEQUE[status] } });
    } else if (status === 'paid' && !p.transaction) {
      p.paidAt = paidAt || new Date();
      await createTx(contract, p, contract.car?._id || contract.car);
    } else if (status !== 'paid' && p.transaction) {
      await Transaction.findByIdAndDelete(p.transaction);
      p.transaction = undefined;
    }
  }
  p.status = status;
  p.paid = status === 'paid';
  p.paidAt = status === 'paid' ? paidAt || p.paidAt || new Date() : undefined;
  log(contract, 'payment', `ردیف ${contract.payments.indexOf(p) + 1}: ${status}`);
  await contract.save();
  return contract;
}

/** وقتی وضعیت چک از «دفتر چک» عوض شد، قسط قرارداد هم به‌روز شود */
export async function syncFromCheque(cheque) {
  if (!cheque?.contract) return;
  const c = await Contract.findById(cheque.contract);
  if (!c) return;
  const p = c.payments.find((x) => String(x.cheque) === String(cheque._id));
  if (!p) return;
  const st = CHEQUE_TO_PAYMENT[cheque.status] || 'pending';
  if (paymentStatus(p) === st) return;
  p.status = st;
  p.paid = st === 'paid';
  p.paidAt = st === 'paid' ? new Date() : undefined;
  log(c, 'payment', `همگام با دفتر چک: ${cheque.number || ''}`);
  await c.save();
}

/** ویرایش پیش‌نویس */
export async function updateDraft(contract, body) {
  if (contract.status !== 'draft') {
    // قرارداد امضاشده فقط یادداشت می‌پذیرد
    if (body.notes !== undefined) contract.notes = body.notes;
    else bad('قرارداد امضاشده/لغوشده قابل ویرایش نیست؛ فقط یادداشت.');
    await contract.save();
    return contract;
  }
  const data = normalizePayload(body);
  const merged = { ...contract.toObject(), ...data };
  const err = validateContract(merged);
  if (err) bad(err);
  Object.assign(contract, data);
  log(contract, 'edited');
  await contract.save();
  return contract;
}

