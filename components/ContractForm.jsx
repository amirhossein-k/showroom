'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { MoneyInput, NumberInput, JalaliDateInput } from './inputs';
import { toJalali, jalaliToDate, jalaliMonthLength } from '@/lib/jalali';
import { priceShort, formatNumber, toFa } from '@/lib/persian';
import { DEFAULT_TERMS, PAYMENT_KINDS, isValidNationalId, isValidMobile, paymentStatus } from '@/lib/contractDefaults';

function addJalaliMonths(iso, n) {
  const { jy, jm, jd } = toJalali(iso || new Date());
  const total = jm - 1 + n;
  const y = jy + Math.floor(total / 12);
  const m = (total % 12) + 1;
  return jalaliToDate(y, m, Math.min(jd, jalaliMonthLength(y, m))).toISOString();
}
const addDaysIso = (iso, d) => new Date(new Date(iso).getTime() + d * 86400000).toISOString();

const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-asphalt-900';
const card = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';

function Field({ label, error, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold text-ink-soft">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-mute">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children, action }) {
  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PartyFields({ title, value, onChange, withAddress = true }) {
  const v = value || {};
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.value });
  const idErr = v.nationalId && !isValidNationalId(v.nationalId) ? 'کد ملی معتبر نیست' : '';
  const phErr = v.phone && !isValidMobile(v.phone) ? 'موبایل ۱۱ رقمی و با ۰۹ شروع شود' : '';
  return (
    <Section title={title}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی *">
          <input className={inp} value={v.name || ''} onChange={set('name')} />
        </Field>
        <Field label="نام پدر">
          <input className={inp} value={v.fatherName || ''} onChange={set('fatherName')} />
        </Field>
        <Field label="کد ملی *" error={idErr}>
          <input className={inp} dir="ltr" inputMode="numeric" maxLength={10} value={v.nationalId || ''} onChange={set('nationalId')} />
        </Field>
        <Field label="تلفن همراه" error={phErr}>
          <input className={inp} dir="ltr" inputMode="tel" maxLength={11} value={v.phone || ''} onChange={set('phone')} />
        </Field>
        {withAddress && (
          <Field label="نشانی" className="sm:col-span-2">
            <textarea className={inp} rows={2} value={v.address || ''} onChange={set('address')} />
          </Field>
        )}
      </div>
    </Section>
  );
}

/**
 * فرم قولنامه — ساخت جدید یا ویرایش پیش‌نویس
 * props: car, customers, settings, contract? (برای ویرایش)
 */
export default function ContractForm({ car, customers = [], settings = {}, contract }) {
  const router = useRouter();
  const editing = !!contract?._id;
  const consign = car.ownership === 'consignment';
  const today = new Date().toISOString();
  const defaultTerms = settings.contractTerms?.length ? settings.contractTerms : DEFAULT_TERMS;

  const [customer, setCustomer] = useState(contract?.customer ? String(contract.customer) : '');
  const [buyer, setBuyer] = useState(contract?.buyer || {});
  const [seller, setSeller] = useState(
    contract?.seller ||
      (consign
        ? { name: car.consignor?.name, phone: car.consignor?.phone }
        : { name: settings.ownerName || settings.showroomName, fatherName: settings.ownerFatherName, nationalId: settings.ownerNationalId, phone: settings.showroomPhone, address: settings.showroomAddress })
  );
  const [place, setPlace] = useState(contract?.place ?? (settings.contractCity || ''));
  const [totalPrice, setTotal] = useState(contract?.totalPrice ?? (car.askingPrice || 0));
  const [date, setDate] = useState(contract?.date || today);
  const [deliveryDate, setDelivery] = useState(contract?.deliveryDate || today);
  const [transferDate, setTransfer] = useState(contract?.transferDate || addDaysIso(today, settings.defaultTransferDays || 30));
  const [penaltyPerDay, setPenalty] = useState(contract?.penaltyPerDay ?? (settings.defaultPenaltyPerDay || 0));
  const [payments, setPayments] = useState(contract?.payments || []);
  const [terms, setTerms] = useState((contract?.terms?.length ? contract.terms : defaultTerms).join('\n'));
  const [witnesses, setWitnesses] = useState(contract?.witnesses?.length ? contract.witnesses : [{}, {}]);
  const [notes, setNotes] = useState(contract?.notes || '');
  const [gen, setGen] = useState({ deposit: 0, depositKind: 'transfer', count: 6, every: 1, start: addJalaliMonths(today, 1), kind: 'cheque' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState('');

  const sum = useMemo(() => payments.reduce((a, p) => a + (Number(p.amount) || 0), 0), [payments]);
  const diff = totalPrice - sum;
  const upfront = payments.filter((p) => p.kind !== 'cheque' && paymentStatus(p) === 'paid').reduce((a, p) => a + Number(p.amount || 0), 0);

  const pickCustomer = (id) => {
    setCustomer(id);
    const c = customers.find((x) => String(x._id) === id);
    if (c) setBuyer({ name: c.name, fatherName: c.fatherName, phone: c.phone, nationalId: c.nationalId, address: c.address });
  };

  // ساخت خودکار پیش‌پرداخت + اقساط مساوی
  const generate = () => {
    const rows = [];
    const dep = Number(gen.deposit) || 0;
    if (dep) rows.push({ kind: gen.depositKind, amount: dep, dueDate: date, status: gen.depositKind !== 'cheque' ? 'paid' : 'pending' });
    const n = Math.max(1, Number(gen.count) || 1);
    const rest = Math.max(0, totalPrice - dep);
    const each = Math.floor(rest / n / 1000) * 1000;
    for (let i = 0; i < n; i++) {
      const amount = i === n - 1 ? rest - each * (n - 1) : each;
      rows.push({ kind: gen.kind, amount, dueDate: addJalaliMonths(gen.start, i * (Number(gen.every) || 1)), status: 'pending' });
    }
    setPayments(rows);
  };

  const setPay = (i, patch) => setPayments((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const setWit = (i, patch) => setWitnesses((ws) => ws.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  const clientCheck = (strict) => {
    const e = [];
    if (!buyer.name) e.push('نام خریدار را وارد کن.');
    if (!payments.length) e.push('حداقل یک پرداخت ثبت کن.');
    if (Math.abs(diff) > 1) e.push(`جمع پرداخت‌ها ${priceShort(Math.abs(diff))} ${diff > 0 ? 'کمتر' : 'بیشتر'} از مبلغ کل است.`);
    if (buyer.nationalId && !isValidNationalId(buyer.nationalId)) e.push('کد ملی خریدار معتبر نیست.');
    if (seller.nationalId && !isValidNationalId(seller.nationalId)) e.push('کد ملی فروشنده معتبر نیست.');
    if (strict) {
      if (!seller.name) e.push('نام فروشنده را وارد کن.');
      if (!buyer.nationalId || !seller.nationalId) e.push('برای امضا کد ملی هر دو طرف لازم است.');
      if (!deliveryDate || !transferDate) e.push('تاریخ تحویل و انتقال سند را مشخص کن.');
      payments.forEach((p, i) => p.kind === 'cheque' && !p.number && !p.sayadId && e.push(`شماره/صیادی چک ردیف ${toFa(i + 1)} را وارد کن.`));
    }
    return e.join('\n');
  };

  const submit = async (mode) => {
    setErr('');
    const strict = mode === 'signed';
    const e = clientCheck(strict);
    if (e) return setErr(e);
    if (strict && !confirm('بعد از امضا، چک‌ها در دفتر چک ثبت و خودرو «منتظر انتقال سند» می‌شود و قرارداد دیگر قابل ویرایش نیست. ادامه می‌دهی؟')) return;
    setSaving(mode);
    const payload = {
      car: car._id,
      customer: customer || undefined,
      buyer,
      seller,
      place,
      totalPrice,
      date,
      deliveryDate,
      transferDate,
      penaltyPerDay,
      payments,
      terms: terms.split('\n').map((t) => t.trim()).filter(Boolean),
      witnesses: witnesses.filter((w) => w.name),
      notes,
    };
    try {
      let id = contract?._id;
      if (editing) {
        await api(`/api/contracts/${id}`, 'PATCH', payload);
        if (strict) await api(`/api/contracts/${id}/status`, 'POST', { action: 'sign' });
      } else {
        const c = await api('/api/contracts', 'POST', { ...payload, status: mode });
        id = c._id;
      }
      router.push(strict ? `/contracts/${id}/print` : `/contracts/${id}`);
      router.refresh();
    } catch (ex) {
      setErr(ex.message);
      setSaving('');
    }
  };

  return (
    <div className="space-y-4">
      <Section title="خریدار از فهرست مشتری‌ها">
        <select className={inp} value={customer} onChange={(e) => pickCustomer(e.target.value)}>
          <option value="">— مشتری جدید —</option>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} {c.phone ? `· ${toFa(c.phone)}` : ''}
            </option>
          ))}
        </select>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <PartyFields title={consign ? 'فروشنده (مالک امانی)' : 'فروشنده'} value={seller} onChange={setSeller} />
        <PartyFields title="خریدار" value={buyer} onChange={setBuyer} />
      </div>

      <Section title="مبلغ و تاریخ‌ها">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="مبلغ کل قرارداد (ثمن معامله)" className="sm:col-span-2 lg:col-span-1">
            <MoneyInput value={totalPrice} onChange={setTotal} />
          </Field>
          <Field label="تاریخ قرارداد">
            <JalaliDateInput value={date} onChange={(v) => v && setDate(v)} />
          </Field>
          <Field label="محل تنظیم قرارداد">
            <input className={inp} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="مثلاً تهران" />
          </Field>
          <Field label="تاریخ تحویل خودرو">
            <JalaliDateInput value={deliveryDate} onChange={setDelivery} />
          </Field>
          <Field label="تاریخ حضور در دفترخانه (انتقال سند)">
            <JalaliDateInput value={transferDate} onChange={setTransfer} />
          </Field>
          <Field label="وجه التزام تأخیر (روزانه)" hint="برای هر روز تأخیر در تحویل یا انتقال سند">
            <MoneyInput value={penaltyPerDay} onChange={setPenalty} words={false} />
          </Field>
        </div>
      </Section>

      <Section title="ساخت خودکار اقساط">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="پیش‌پرداخت">
            <MoneyInput value={gen.deposit} onChange={(v) => setGen({ ...gen, deposit: v })} words={false} />
          </Field>
          <Field label="نوع پیش‌پرداخت">
            <select className={inp} value={gen.depositKind} onChange={(e) => setGen({ ...gen, depositKind: e.target.value })}>
              {Object.entries(PAYMENT_KINDS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="تعداد اقساط">
            <NumberInput value={gen.count} onChange={(v) => setGen({ ...gen, count: v })} suffix="قسط" />
          </Field>
          <Field label="فاصله">
            <NumberInput value={gen.every} onChange={(v) => setGen({ ...gen, every: v })} suffix="ماه" />
          </Field>
          <Field label="نوع اقساط">
            <select className={inp} value={gen.kind} onChange={(e) => setGen({ ...gen, kind: e.target.value })}>
              {Object.entries(PAYMENT_KINDS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="سررسید اولین قسط">
            <JalaliDateInput value={gen.start} onChange={(v) => v && setGen({ ...gen, start: v })} />
          </Field>
        </div>
        <button type="button" onClick={generate} className="mt-3 rounded-lg bg-asphalt-900 px-4 py-2 text-sm font-bold text-white">
          ساخت جدول اقساط
        </button>
      </Section>

      <Section
        title="برنامه پرداخت"
        action={
          <button type="button" onClick={() => setPayments([...payments, { kind: 'cheque', amount: Math.max(0, diff), dueDate: date, status: 'pending' }])} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-bold">
            + ردیف
          </button>
        }
      >
        {!payments.length && <p className="text-sm text-ink-mute">هنوز ردیفی نیست. از «ساخت خودکار اقساط» یا «+ ردیف» استفاده کن.</p>}
        <div className="space-y-3">
          {payments.map((p, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="grid items-end gap-2 sm:grid-cols-[auto_1fr_1.4fr_1fr_auto]">
                <span className="pb-2 text-sm font-black text-ink-mute">{toFa(i + 1)}</span>
                <Field label="نوع">
                  <select className={inp} value={p.kind} onChange={(e) => setPay(i, { kind: e.target.value, status: 'pending' })}>
                    {Object.entries(PAYMENT_KINDS).map(([k, l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="مبلغ">
                  <MoneyInput value={p.amount} onChange={(v) => setPay(i, { amount: v })} words={false} />
                </Field>
                <Field label={p.kind === 'cheque' ? 'سررسید' : 'تاریخ'}>
                  <JalaliDateInput value={p.dueDate} onChange={(v) => setPay(i, { dueDate: v })} />
                </Field>
                <button type="button" onClick={() => setPayments(payments.filter((_, j) => j !== i))} className="rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
                  حذف
                </button>
              </div>
              {p.kind === 'cheque' ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input className={inp} placeholder="بانک" value={p.bank || ''} onChange={(e) => setPay(i, { bank: e.target.value })} />
                  <input className={inp} placeholder="شماره چک" dir="ltr" value={p.number || ''} onChange={(e) => setPay(i, { number: e.target.value })} />
                  <input className={inp} placeholder="شناسه صیادی (۱۶ رقم)" dir="ltr" maxLength={16} value={p.sayadId || ''} onChange={(e) => setPay(i, { sayadId: e.target.value })} />
                </div>
              ) : (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={paymentStatus(p) === 'paid'} onChange={(e) => setPay(i, { status: e.target.checked ? 'paid' : 'pending' })} />
                  دریافت شد (بعد از امضا در دفتر نقدینگی ثبت می‌شود)
                </label>
              )}
            </div>
          ))}
        </div>
        <div className={`mt-3 rounded-lg p-3 text-sm font-bold ${Math.abs(diff) > 1 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          جمع پرداخت‌ها: {formatNumber(sum)} تومان {Math.abs(diff) > 1 ? `· اختلاف ${formatNumber(diff)}` : '✓ برابر با مبلغ کل'}
          {upfront > 0 && <span className="mr-3 font-normal text-ink-soft">· نقد دریافتی: {priceShort(upfront)} ({toFa(Math.round((upfront / (totalPrice || 1)) * 100))}٪)</span>}
        </div>
      </Section>

      <Section
        title="بندهای قرارداد (هر خط یک بند)"
        action={
          <button type="button" onClick={() => setTerms(defaultTerms.join('\n'))} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold">
            بازگردانی پیش‌فرض‌ها
          </button>
        }
      >
        <textarea className={`${inp} leading-7`} rows={9} value={terms} onChange={(e) => setTerms(e.target.value)} />
        <p className="mt-1 text-xs text-ink-mute">پیش‌فرض‌ها از «تنظیمات ← بندهای قولنامه» قابل تغییرند.</p>
      </Section>

      <Section
        title="شاهدان"
        action={
          <button type="button" onClick={() => setWitnesses([...witnesses, {}])} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-bold">
            + شاهد
          </button>
        }
      >
        <div className="space-y-2">
          {witnesses.map((w, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <input className={inp} placeholder={`نام شاهد ${toFa(i + 1)}`} value={w.name || ''} onChange={(e) => setWit(i, { name: e.target.value })} />
              <input className={inp} placeholder="نام پدر" value={w.fatherName || ''} onChange={(e) => setWit(i, { fatherName: e.target.value })} />
              <input className={`${inp} ${w.nationalId && !isValidNationalId(w.nationalId) ? 'border-red-400' : ''}`} placeholder="کد ملی" dir="ltr" maxLength={10} value={w.nationalId || ''} onChange={(e) => setWit(i, { nationalId: e.target.value })} />
              <input className={inp} placeholder="تلفن" dir="ltr" value={w.phone || ''} onChange={(e) => setWit(i, { phone: e.target.value })} />
              <button type="button" onClick={() => setWitnesses(witnesses.filter((_, j) => j !== i))} className="rounded-lg px-3 text-sm text-red-600">
                حذف
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="یادداشت داخلی (در چاپ نمی‌آید)">
        <textarea className={inp} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Section>

      {err && <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 font-sans text-sm text-red-600">{err}</pre>}

      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-gray-100 bg-white/90 py-3 backdrop-blur">
        <button type="button" disabled={!!saving} onClick={() => submit('draft')} className="rounded-xl border border-asphalt-900 px-5 py-3 font-bold disabled:opacity-50">
          {saving === 'draft' ? 'در حال ذخیره…' : 'ذخیره پیش‌نویس'}
        </button>
        <button type="button" disabled={!!saving} onClick={() => submit('signed')} className="flex-1 rounded-xl bg-asphalt-900 px-5 py-3 font-bold text-white disabled:opacity-50">
          {saving === 'signed' ? 'در حال ثبت…' : 'ثبت نهایی (امضا) و چاپ'}
        </button>
      </div>
    </div>
  );
}
