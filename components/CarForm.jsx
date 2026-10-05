'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CAR_STATUS, OWNERSHIP, PLATE_LETTERS, COMMON_BRANDS, COMMON_COLORS } from '@/lib/constants';
import { toEnDigits } from '@/lib/persian';
import { Field, Plate } from './ui';
import { MoneyInput, NumberInput, JalaliDateInput, ErrorText, Toggle } from './inputs';
import ImageUploader from './ImageUploader';

const EMPTY = {
  brand: '', model: '', trim: '', year: '', color: '', mileage: 0, vin: '', engineNo: '',
  plate: { p1: '', letter: 'ب', p2: '', region: '' }, images: [],
  ownership: 'owned', consignor: { name: '', phone: '' }, ownerPrice: 0,
  status: 'available', purchasePrice: 0, purchaseDate: new Date().toISOString(), seller: { name: '', phone: '' },
  askingPrice: 0, notes: '',
};

function Block({ title, children }) {
  return (
    <section className="card p-4 sm:p-6">
      <h2 className="h-section mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function CarForm({ initial }) {
  const router = useRouter();
  const [f, setF] = useState(() => ({ ...EMPTY, ...(initial || {}), plate: { ...EMPTY.plate, ...(initial?.plate || {}) }, consignor: { ...EMPTY.consignor, ...(initial?.consignor || {}) }, seller: { ...EMPTY.seller, ...(initial?.seller || {}) } }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setIn = (k, sub, v) => setF((s) => ({ ...s, [k]: { ...s[k], [sub]: v } }));
  const digits = (v, n) => toEnDigits(v).replace(/\D/g, '').slice(0, n);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.brand || !f.model) return setErr('برند و مدل را وارد کنید.');
    setBusy(true);
    setErr('');
    try {
      const body = { ...f, year: Number(toEnDigits(f.year)) || undefined };
      const doc = initial?._id ? await api(`/api/cars/${initial._id}`, 'PATCH', body) : await api('/api/cars', 'POST', body);
      router.push(`/cars/${doc._id}`);
      router.refresh();
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Block title="مشخصات خودرو">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="برند *">
              <input className="input" list="brands" value={f.brand} onChange={(e) => set('brand', e.target.value)} placeholder="پژو" />
              <datalist id="brands">{COMMON_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="مدل *">
              <input className="input" value={f.model} onChange={(e) => set('model', e.target.value)} placeholder="206 تیپ 2" />
            </Field>
            <Field label="تیپ / آپشن">
              <input className="input" value={f.trim || ''} onChange={(e) => set('trim', e.target.value)} placeholder="اتومات، فول" />
            </Field>
            <Field label="سال ساخت">
              <input className="input num" inputMode="numeric" value={f.year || ''} onChange={(e) => set('year', digits(e.target.value, 4))} placeholder="۱۴۰۲" />
            </Field>
            <Field label="رنگ">
              <input className="input" list="colors" value={f.color || ''} onChange={(e) => set('color', e.target.value)} />
              <datalist id="colors">{COMMON_COLORS.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="کارکرد">
              <NumberInput value={f.mileage} onChange={(v) => set('mileage', v)} suffix="کیلومتر" placeholder="۰" />
            </Field>
            <Field label="شماره شاسی (VIN)" className="sm:col-span-2">
              <input dir="ltr" className="input text-left uppercase tracking-wider" value={f.vin || ''} onChange={(e) => set('vin', e.target.value.toUpperCase())} />
            </Field>
            <Field label="شماره موتور">
              <input dir="ltr" className="input text-left" value={f.engineNo || ''} onChange={(e) => set('engineNo', e.target.value)} />
            </Field>
          </div>

          <div className="mt-5 rounded-2xl bg-paper p-4">
            <span className="label">پلاک</span>
            <div className="flex flex-wrap items-center gap-3">
              <div dir="ltr" className="grid w-full max-w-sm grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1fr)] items-center gap-1.5">
                <input className="input px-1 text-center num" placeholder="۲۲" value={f.plate.p1} onChange={(e) => setIn('plate', 'p1', digits(e.target.value, 2))} aria-label="دو رقم" />
                <select className="input px-1 text-center" value={f.plate.letter} onChange={(e) => setIn('plate', 'letter', e.target.value)} aria-label="حرف">
                  {PLATE_LETTERS.map((l) => <option key={l}>{l}</option>)}
                </select>
                <input className="input px-1 text-center num" placeholder="۴۸۱" value={f.plate.p2} onChange={(e) => setIn('plate', 'p2', digits(e.target.value, 3))} aria-label="سه رقم" />
                <input className="input px-1 text-center num" placeholder="۱۰" value={f.plate.region} onChange={(e) => setIn('plate', 'region', digits(e.target.value, 2))} aria-label="کد شهر" />
              </div>
              <Plate plate={f.plate} />
            </div>
          </div>
        </Block>

        <Block title="عکس‌ها">
          <ImageUploader images={f.images || []} onChange={(v) => set('images', v)} />
        </Block>

        <Block title="توضیحات">
          <textarea className="input min-h-[110px]" value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="وضعیت بدنه، رنگ‌شدگی، آپشن‌ها…" />
        </Block>
      </div>

      <div className="space-y-4">
        <Block title="مالکیت و خرید">
          <div className="mb-4">
            <Toggle options={OWNERSHIP} value={f.ownership} onChange={(v) => set('ownership', v)} />
          </div>
          {f.ownership === 'owned' ? (
            <div className="space-y-4">
              <Field label="قیمت خرید">
                <MoneyInput value={f.purchasePrice} onChange={(v) => set('purchasePrice', v)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="فروشنده">
                  <input className="input" value={f.seller.name} onChange={(e) => setIn('seller', 'name', e.target.value)} />
                </Field>
                <Field label="تلفن فروشنده">
                  <input dir="ltr" className="input text-left" value={f.seller.phone} onChange={(e) => setIn('seller', 'phone', toEnDigits(e.target.value))} />
                </Field>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="مالک خودرو">
                  <input className="input" value={f.consignor.name} onChange={(e) => setIn('consignor', 'name', e.target.value)} />
                </Field>
                <Field label="تلفن مالک">
                  <input dir="ltr" className="input text-left" value={f.consignor.phone} onChange={(e) => setIn('consignor', 'phone', toEnDigits(e.target.value))} />
                </Field>
              </div>
              <Field label="مبلغ توافقی با مالک" hint="مبلغی که پس از فروش به مالک پرداخت می‌شود.">
                <MoneyInput value={f.ownerPrice} onChange={(v) => set('ownerPrice', v)} />
              </Field>
            </div>
          )}
          <Field label="تاریخ ورود به نمایشگاه" className="mt-4">
            <JalaliDateInput value={f.purchaseDate} onChange={(v) => set('purchaseDate', v)} />
          </Field>
        </Block>

        <Block title="فروش">
          <Field label="قیمت پیشنهادی فروش">
            <MoneyInput value={f.askingPrice} onChange={(v) => set('askingPrice', v)} />
          </Field>
          {!initial?._id && (
            <Field label="وضعیت" className="mt-4">
              <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(CAR_STATUS).filter(([k]) => !['sold', 'awaiting_transfer'].includes(k)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          )}
        </Block>

        <ErrorText error={err} />
        <div className="sticky bottom-3 z-10 flex gap-2">
          <button disabled={busy} className="btn-primary flex-1 shadow-lift">{busy ? 'در حال ذخیره…' : initial?._id ? 'ذخیره تغییرات' : 'ثبت خودرو'}</button>
          <button type="button" className="btn-ghost" onClick={() => router.back()}>انصراف</button>
        </div>
      </div>
    </form>
  );
}
