'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LEAD_SOURCES, LEAD_STATUS, TX_CATEGORIES, TX_METHODS, CHEQUE_STATUS } from '@/lib/constants';
import { toEnDigits, toFa, formatNumber, formatDate } from '@/lib/persian';
import { Field } from './ui';
import { MoneyInput, JalaliDateInput, ErrorText, Toggle } from './inputs';
import { useSaver } from './useSaver';

const carLabel = (c) => `${c.brand} ${c.model} ${c.year || ''}`;

function CarSelect({ cars, value, onChange, label = 'خودروی مرتبط' }) {
  return (
    <Field label={label}>
      <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— بدون خودرو —</option>
        {cars.map((c) => (
          <option key={c._id} value={c._id}>{toFa(carLabel(c))}</option>
        ))}
      </select>
    </Field>
  );
}

export function ChequeForm({ initial, cars = [], fixedCar, onDone }) {
  const [f, setF] = useState({ direction: 'received', number: '', sayadId: '', bank: '', amount: 0, dueDate: null, party: '', phone: '', status: 'pending', note: '', ...(initial || {}), car: initial?.car?._id || initial?.car || fixedCar || null });
  const s = useSaver();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!f.amount || !f.dueDate) return;
    s.run(async () => {
      if (initial?._id) await api(`/api/cheques/${initial._id}`, 'PATCH', f);
      else await api('/api/cheques', 'POST', f);
      onDone?.();
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Toggle options={{ received: 'چک دریافتی', issued: 'چک پرداختی' }} value={f.direction} onChange={(v) => set('direction', v)} />
      <Field label="مبلغ چک *">
        <MoneyInput value={f.amount} onChange={(v) => set('amount', v)} />
      </Field>
      <Field label="تاریخ سررسید *">
        <JalaliDateInput value={f.dueDate} onChange={(v) => set('dueDate', v)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={f.direction === 'received' ? 'صادرکننده' : 'در وجه'}>
          <input className="input" value={f.party} onChange={(e) => set('party', e.target.value)} />
        </Field>
        <Field label="تلفن">
          <input dir="ltr" className="input text-left" value={f.phone || ''} onChange={(e) => set('phone', toEnDigits(e.target.value))} />
        </Field>
        <Field label="بانک">
          <input className="input" value={f.bank || ''} onChange={(e) => set('bank', e.target.value)} />
        </Field>
        <Field label="شماره چک">
          <input dir="ltr" className="input text-left" value={f.number || ''} onChange={(e) => set('number', toEnDigits(e.target.value))} />
        </Field>
        <Field label="شناسه صیادی" className="col-span-2">
          <input dir="ltr" className="input text-left" value={f.sayadId || ''} onChange={(e) => set('sayadId', toEnDigits(e.target.value))} />
        </Field>
      </div>
      {!fixedCar && <CarSelect cars={cars} value={f.car} onChange={(v) => set('car', v)} />}
      {initial?._id && (
        <Field label="وضعیت">
          <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
            {Object.entries(CHEQUE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      )}
      <Field label="یادداشت">
        <input className="input" value={f.note || ''} onChange={(e) => set('note', e.target.value)} />
      </Field>
      <ErrorText error={s.err} />
      <button disabled={s.busy || !f.amount || !f.dueDate} className="btn-primary w-full">{s.busy ? 'در حال ذخیره…' : 'ذخیره چک'}</button>
    </form>
  );
}

export function TxForm({ initial, cars = [], fixedCar, defaults = {}, onDone }) {
  const [f, setF] = useState({ direction: 'in', category: 'sale', method: 'transfer', amount: 0, date: new Date().toISOString(), party: '', note: '', ...defaults, ...(initial || {}), car: initial?.car?._id || initial?.car || fixedCar || defaults.car || null });
  const s = useSaver();
  const [validation, setValidation] = useState('');
  const linked = Boolean(initial?.contract);
  const valid = Number.isSafeInteger(f.amount) && f.amount > 0 && f.date && Number.isFinite(Date.parse(f.date));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!linked && !valid) {
      setValidation('مبلغ صحیح مثبت و تاریخ معتبر را وارد کن.');
      return;
    }
    setValidation('');
    s.run(async () => {
      const body = linked ? { note: f.note || '' } : {
        direction: f.direction, category: f.category, method: f.method,
        amount: f.amount, date: f.date, party: f.party || '', note: f.note || '', car: f.car || null,
      };
      if (initial?._id) await api(`/api/transactions/${initial._id}`, 'PATCH', body);
      else await api('/api/transactions', 'POST', body);
      onDone?.();
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      {linked && <p className="rounded-xl bg-plate-soft p-3 text-sm leading-7 text-plate">
        این تراکنش از قولنامه ساخته شده؛ برای حفظ هماهنگی حساب‌ها، اینجا فقط شرح قابل ویرایش است.{' '}
        <Link className="font-bold underline" href={`/contracts/${initial.contract?._id || initial.contract}`}>مدیریت قولنامه</Link>
      </p>}
      {linked && <dl className="grid gap-3 rounded-xl bg-paper p-4 text-sm sm:grid-cols-2">
        {[
          ['نوع', f.direction === 'in' ? 'ورودی' : 'خروجی'],
          ['مبلغ', `${formatNumber(f.amount)} تومان`],
          ['بابت', TX_CATEGORIES[f.category] || f.category],
          ['روش', TX_METHODS[f.method] || f.method],
          ['تاریخ', formatDate(f.date)],
          ['طرف حساب', f.party || 'بدون طرف حساب'],
          ['خودرو', initial.car?.brand ? `${initial.car.brand} ${initial.car.model}` : 'بدون خودرو'],
        ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-ink-mute">{label}</dt><dd className="mt-1 break-words font-bold">{value}</dd></div>)}
      </dl>}
      <fieldset disabled={linked || s.busy} className={linked ? 'hidden' : 'min-w-0 space-y-4 disabled:opacity-70'}>
      <Toggle options={{ in: 'ورودی (دریافت)', out: 'خروجی (پرداخت)' }} value={f.direction} onChange={(v) => set('direction', v)} />
      <Field label="مبلغ *">
        <MoneyInput ariaLabel="مبلغ تراکنش به تومان" value={f.amount} onChange={(v) => set('amount', v)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="بابت">
          <select className="input" value={f.category} onChange={(e) => set('category', e.target.value)}>
            {Object.entries(TX_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="روش">
          <select className="input" value={f.method} onChange={(e) => set('method', e.target.value)}>
            {Object.entries(TX_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <Field label="تاریخ *">
        <JalaliDateInput value={f.date} onChange={(v) => set('date', v)} />
      </Field>
      <Field label="طرف حساب">
        <input className="input" value={f.party || ''} onChange={(e) => set('party', e.target.value)} />
      </Field>
      {!fixedCar && <CarSelect cars={cars} value={f.car} onChange={(v) => set('car', v)} />}
      </fieldset>
      <Field label="شرح">
        <textarea className="input" rows={3} disabled={s.busy} value={f.note || ''} onChange={(e) => set('note', e.target.value)} />
      </Field>
      <ErrorText error={validation || s.err} />
      {!linked && !valid && <p className="text-sm text-ink-mute">مبلغ صحیح مثبت و تاریخ الزامی‌اند.</p>}
      <button disabled={s.busy || (!linked && !valid)} className="btn-primary w-full">{s.busy ? 'در حال ذخیره…' : initial?._id ? 'ذخیره تغییرات' : 'ثبت تراکنش'}</button>
    </form>
  );
}

export function CustomerForm({ initial, cars = [], onDone }) {
  const [f, setF] = useState({ name: '', phone: '', nationalId: '', address: '', source: 'divar', referrer: '', status: 'new', wanted: '', budgetMin: 0, budgetMax: 0, interestedCars: [], nextFollowUp: null, ...(initial || {}) });
  const ids = (f.interestedCars || []).map((c) => c?._id || c);
  const s = useSaver();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleCar = (id) => set('interestedCars', ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const submit = (e) => {
    e.preventDefault();
    if (!f.name) return;
    const body = { ...f, interestedCars: ids };
    if (!initial?._id) body.lastContact = new Date().toISOString();
    s.run(async () => {
      if (initial?._id) await api(`/api/customers/${initial._id}`, 'PATCH', body);
      else await api('/api/customers', 'POST', body);
      onDone?.();
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام *">
          <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="موبایل">
          <input dir="ltr" className="input text-left" value={f.phone || ''} onChange={(e) => set('phone', toEnDigits(e.target.value))} />
        </Field>
        <Field label="منبع لید">
          <select className="input" value={f.source} onChange={(e) => set('source', e.target.value)}>
            {Object.entries(LEAD_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="وضعیت">
          <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
            {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        {f.source === 'referral' && (
          <Field label="معرف" className="sm:col-span-2">
            <input className="input" value={f.referrer || ''} onChange={(e) => set('referrer', e.target.value)} />
          </Field>
        )}
        <Field label="خودروی مدنظر" className="sm:col-span-2">
          <input className="input" value={f.wanted || ''} onChange={(e) => set('wanted', e.target.value)} placeholder="مثلاً: شاسی‌بلند سفید تا ۲ میلیارد" />
        </Field>
        <Field label="بودجه از">
          <MoneyInput value={f.budgetMin} onChange={(v) => set('budgetMin', v)} placeholder="اختیاری" />
        </Field>
        <Field label="بودجه تا">
          <MoneyInput value={f.budgetMax} onChange={(v) => set('budgetMax', v)} placeholder="اختیاری" />
        </Field>
      </div>
      <Field label="تاریخ پیگیری بعدی">
        <JalaliDateInput value={f.nextFollowUp} onChange={(v) => set('nextFollowUp', v)} />
      </Field>
      {cars.length > 0 && (
        <div>
          <span className="label">اتصال به خودروهای موجود</span>
          <div className="flex flex-wrap gap-2">
            {cars.map((c) => (
              <button type="button" key={c._id} onClick={() => toggleCar(c._id)} className={`chip border py-2 transition ${ids.includes(c._id) ? 'border-plate bg-plate text-white' : 'border-line bg-white text-ink-soft hover:border-plate/50'}`}>
                {toFa(carLabel(c))}
              </button>
            ))}
          </div>
        </div>
      )}
      <details className="rounded-xl bg-paper p-3">
        <summary className="cursor-pointer text-sm font-bold text-ink-soft">اطلاعات فاکتور (کد ملی و آدرس)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="کد ملی / شناسه ملی">
            <input dir="ltr" className="input text-left" value={f.nationalId || ''} onChange={(e) => set('nationalId', toEnDigits(e.target.value))} />
          </Field>
          <Field label="آدرس">
            <input className="input" value={f.address || ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </div>
      </details>
      <ErrorText error={s.err} />
      <button disabled={s.busy || !f.name} className="btn-primary w-full">{s.busy ? 'در حال ذخیره…' : 'ذخیره مشتری'}</button>
    </form>
  );
}

export function DeleteButton({ url, redirect, label = 'حذف', confirmText = 'از حذف مطمئنی؟' }) {
  const s = useSaver();
  return (
    <button
      type="button"
      className="btn-danger"
      disabled={s.busy}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        s.run(async () => {
          await api(url, 'DELETE');
          if (redirect) s.router.push(redirect);
        });
      }}
    >
      {label}
    </button>
  );
}
