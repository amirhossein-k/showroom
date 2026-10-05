import { TX_CATEGORIES, TX_METHODS } from './constants.js';

const fields = ['direction', 'category', 'method', 'amount', 'date', 'party', 'note', 'car'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** Allowlist: clients cannot overwrite a contract link or Mongo operators. */
export function transactionPayload(body, { partial = false, linked = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('اطلاعات تراکنش نامعتبر است.');
  if (linked && fields.some((key) => key !== 'note' && own(body, key))) {
    throw new Error('اطلاعات مالی تراکنش متصل به قولنامه باید از همان قولنامه اصلاح شود؛ اینجا فقط شرح قابل ویرایش است.');
  }
  const out = {};
  for (const key of fields) if (own(body, key)) out[key] = body[key];
  if (!partial) {
    out.category ??= 'other';
    out.method ??= 'transfer';
    if (!own(out, 'date')) out.date = new Date().toISOString();
  }
  if ((!partial || own(out, 'amount')) && (!Number.isSafeInteger(out.amount) || out.amount <= 0)) throw new Error('مبلغ باید عدد صحیح مثبت و معتبر به تومان باشد.');
  if ((!partial || own(out, 'direction')) && !['in', 'out'].includes(out.direction)) throw new Error('نوع تراکنش نامعتبر است.');
  if (own(out, 'category') && !own(TX_CATEGORIES, out.category)) throw new Error('بابت تراکنش نامعتبر است.');
  if (own(out, 'method') && !own(TX_METHODS, out.method)) throw new Error('روش پرداخت نامعتبر است.');
  if (own(out, 'date')) {
    if (typeof out.date !== 'string' || !out.date || !Number.isFinite(Date.parse(out.date))) throw new Error('تاریخ معتبر را انتخاب کن.');
    out.date = new Date(out.date).toISOString();
  }
  for (const key of ['party', 'note']) {
    if (own(out, key)) {
      if (typeof out[key] !== 'string') throw new Error('طرف حساب و شرح باید متن باشند.');
      out[key] = out[key].trim();
    }
  }
  if (own(out, 'car')) {
    if (out.car === '') out.car = null;
    if (out.car !== null && (typeof out.car !== 'string' || !/^[a-f\d]{24}$/i.test(out.car))) throw new Error('خودروی مرتبط نامعتبر است.');
  }
  if (!Object.keys(out).length) throw new Error('اطلاعاتی برای ذخیره ارسال نشده است.');
  return out;
}
