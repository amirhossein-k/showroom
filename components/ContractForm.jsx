'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { MoneyInput, NumberInput, JalaliDateInput } from './inputs';
import { toJalali, jalaliToDate, jalaliMonthLength } from '@/lib/jalali';
import { priceShort, formatNumber } from '@/lib/persian';
import { DEFAULT_TERMS, PAYMENT_KINDS } from '@/lib/contractDefaults';

function addJalaliMonths(iso, n) {
  const { jy, jm, jd } = toJalali(iso || new Date());
  const total = jm - 1 + n;
  const y = jy + Math.floor(total / 12);
  const m = (total % 12) + 1;
  return jalaliToDate(y, m, Math.min(jd, jalaliMonthLength(y, m))).toISOString();
}

const Field = ({ label, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-bold">{label}</span>
    {children}
  </label>
);
const Text = (props) => <input {...props} className="w-full rounded-lg border border-gray-200 px-3 py-2" />;

function PartyFields({ title, value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="rounded-xl border border-gray-100 p-4">
      <legend className="px-2 text-sm font-bold">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی"><Text value={value.name || ''} onChange={set('name')} /></Field>
        <Field label="نام پدر"><Text value={value.fatherName || ''} onChange={set('fatherName')} /></Field>
        <Field label="کد ملی"><Text inputMode="numeric" value={value.nationalId || ''} onChange={set('nationalId')} /></Field>
        <Field label="موبایل"><Text inputMode="tel" value={value.phone || ''} onChange={set('phone')} /></Field>
        <div className="sm:col-span-2"><Field label="نشانی"><Text value={value.address || ''} onChange={set('address')} /></Field></div>
      </div>
    </fieldset>
  );
}

export default function ContractForm({ car, customers = [], settings = {} }) {
  const router = useRouter();
  const consign = car.ownership === 'consignment';
  const [customer, setCustomer] = useState('');
  const [buyer, setBuyer] = useState({});
  const [seller, setSeller] = useState(
    consign ? { name: car.consignor?.name, phone: car.consignor?.phone } : { name: settings.ownerName || settings.showroomName, phone: settings.showroomPhone, address: settings.showroomAddress }
  );
  const [totalPrice, setTotal] = useState(car.askingPrice || 0);
  const [date, setDate] = useState(new Date().toISOString());
  const [deliveryDate, setDelivery] = useState(new Date().toISOString());
  const [transferDate, setTransfer] = useState(addJalaliMonths(new Date().toISOString(), 1));
  const [penaltyPerDay, setPenalty] = useState(0);
  const [payments, setPayments] = useState([]);
  const [terms, setTerms] = useState((settings.contractTerms?.length ? settings.contractTerms : DEFAULT_TERMS).join('\n'));
  const [gen, setGen] = useState({ deposit: 0, depositKind: 'transfer', count: 6, every: 1, start: addJalaliMonths(new Date().toISOString(), 1), kind: 'cheque' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const sum = useMemo(() => payments.reduce((a, p) => a + (Number(p.amount) || 0), 0), [payments]);
  const diff = totalPrice - sum;

  const pickCustomer = (id) => {
    setCustomer(id);
    const c = customers.find((x) => String(x._id) === id);
    if (c) setBuyer({ name: c.name, phone: c.phone, nationalId: c.nationalId, address: c.address });
  };

  // ساخت خودکار پیش‌پرداخت + اقساط مساوی
  const generate = () => {
    const rows = [];
    const dep = Number(gen.deposit) || 0;
    if (dep) rows.push({ kind: gen.depositKind, amount: dep, dueDate: date, paid: gen.depositKind !== 'cheque' });
    const n = Math.max(1, Number(gen.count) || 1);
    const rest = Math.max(0, totalPrice - dep);
    const each = Math.floor(rest / n / 1000) * 1000; // رُند به هزار تومان
    for (let i = 0; i < n; i++) {
      const amount = i === n - 1 ? rest - each * (n - 1) : each;
      rows.push({ kind: gen.kind, amount, dueDate: addJalaliMonths(gen.start, i * (Number(gen.every) || 1)), paid: false });
    }
    setPayments(rows);
  };

  const setPay = (i, patch) => setPayments((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = async () => {
    setErr('');
    if (!buyer.name) return setErr('نام خریدار را وارد کن.');
    if (!payments.length) return setErr('حداقل یک پرداخت ثبت کن.');
    if (Math.abs(diff) > 1) return setErr(`جمع پرداخت‌ها ${priceShort(Math.abs(diff))} ${diff > 0 ? 'کمتر' : 'بیشتر'} از مبلغ کل است.`);
    setSaving(true);
    try {
      const c = await api('/api/contracts', 'POST', {
        car: car._id,
        customer: customer || undefined,
        buyer,
        seller,
        totalPrice,
        date,
        deliveryDate,
        transferDate,
        penaltyPerDay,
        payments,
        terms: terms.split('\n').map((t) => t.trim()).filter(Boolean),
      });
      router.push(`/contracts/${c._id}/print`);
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="انتخاب از مشتری‌ها (اختیاری)">
          <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={customer} onChange={(e) => pickCustomer(e.target.value)}>
            <option value="">— مشتری جدید —</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="مبلغ کل معامله"><MoneyInput value={totalPrice} onChange={setTotal} /></Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PartyFields title={consign ? 'فروشنده (مالک امانی)' : 'فروشنده'} value={seller} onChange={setSeller} />
        <PartyFields title="خریدار" value={buyer} onChange={setBuyer} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="تاریخ قرارداد"><JalaliDateInput value={date} onChange={setDate} /></Field>
        <Field label="تاریخ تحویل خودرو"><JalaliDateInput value={deliveryDate} onChange={setDelivery} /></Field>
        <Field label="تاریخ انتقال سند"><JalaliDateInput value={transferDate} onChange={setTransfer} /></Field>
        <Field label="وجه التزام روزانه"><MoneyInput value={penaltyPerDay} onChange={setPenalty} words={false} /></Field>
      </div>

      <section className="rounded-xl border border-gray-100 p-4">
        <div className="mb-3 font-bold">ساخت خودکار اقساط</div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Field label="پیش‌پرداخت"><MoneyInput value={gen.deposit} onChange={(v) => setGen({ ...gen, deposit: v })} words={false} /></Field>
          <Field label="نوع پیش‌پرداخت">
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={gen.depositKind} onChange={(e) => setGen({ ...gen, depositKind: e.target.value })}>
              {Object.entries(PAYMENT_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="تعداد قسط"><NumberInput value={gen.count} onChange={(v) => setGen({ ...gen, count: v })} suffix="قسط" /></Field>
          <Field label="فاصله"><NumberInput value={gen.every} onChange={(v) => setGen({ ...gen, every: v })} suffix="ماه" /></Field>
          <Field label="نوع اقساط">
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={gen.kind} onChange={(e) => setGen({ ...gen, kind: e.target.value })}>
              {Object.entries(PAYMENT_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="سررسید اولین قسط"><JalaliDateInput value={gen.start} onChange={(v) => setGen({ ...gen, start: v })} /></Field>
        </div>
        <button type="button" onClick={generate} className="mt-3 rounded-lg border border-asphalt-900 px-4 py-2 text-sm font-bold">ساخت جدول اقساط</button>
      </section>

      <section className="rounded-xl border border-gray-100 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold">جدول پرداخت</span>
          <button type="button" onClick={() => setPayments([...payments, { kind: 'cheque', amount: Math.max(0, diff), dueDate: date }])} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-bold">+ ردیف</button>
        </div>
        <div className="space-y-3">
          {payments.map((p, i) => (
            <div key={i} className="grid items-end gap-2 rounded-lg bg-gray-50 p-3 md:grid-cols-[110px_1fr_1fr_auto]">
              <select className="rounded-lg border border-gray-200 px-2 py-2" value={p.kind} onChange={(e) => setPay(i, { kind: e.target.value })}>
                {Object.entries(PAYMENT_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <MoneyInput value={p.amount} onChange={(v) => setPay(i, { amount: v })} words={false} />
              <JalaliDateInput value={p.dueDate} onChange={(v) => setPay(i, { dueDate: v })} />
              <button type="button" onClick={() => setPayments(payments.filter((_, j) => j !== i))} className="rounded-lg px-3 py-2 text-sm text-red-600">حذف</button>
              {p.kind === 'cheque' ? (
                <div className="grid gap-2 sm:grid-cols-3 md:col-span-4">
                  <Text placeholder="بانک" value={p.bank || ''} onChange={(e) => setPay(i, { bank: e.target.value })} />
                  <Text placeholder="شماره چک" value={p.number || ''} onChange={(e) => setPay(i, { number: e.target.value })} />
                  <Text placeholder="شناسه صیادی (۱۶ رقم)" value={p.sayadId || ''} onChange={(e) => setPay(i, { sayadId: e.target.value })} />
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm md:col-span-4">
                  <input type="checkbox" checked={!!p.paid} onChange={(e) => setPay(i, { paid: e.target.checked })} /> دریافت شد (در دفتر نقدینگی ثبت شود)
                </label>
              )}
            </div>
          ))}
        </div>
        <div className={`mt-3 text-sm font-bold ${Math.abs(diff) > 1 ? 'text-red-600' : 'text-green-700'}`}>
          جمع پرداخت‌ها: {formatNumber(sum)} تومان {Math.abs(diff) > 1 ? `· اختلاف ${formatNumber(diff)}` : '✓ برابر با مبلغ کل'}
        </div>
      </section>

      <Field label="شروط قرارداد (هر خط یک بند)">
        <textarea rows={8} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm leading-7" value={terms} onChange={(e) => setTerms(e.target.value)} />
      </Field>

      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      <button type="button" disabled={saving} onClick={submit} className="rounded-xl bg-asphalt-900 px-6 py-3 font-bold text-white disabled:opacity-50">
        {saving ? 'در حال ثبت…' : 'ثبت قولنامه و چاپ'}
      </button>
    </div>
  );
}
