'use client';
import { JalaliDateInput } from './inputs';

const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-asphalt-900';
const lbl = 'mb-1 block text-xs font-bold text-ink-soft';

/** فیلدهای هویتی تکمیلی طرفین: شماره شناسنامه، محل صدور، تاریخ تولد */
export function PartyIdentityExtra({ value, onChange }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  return (
    <>
      <label className="block">
        <span className={lbl}>شماره شناسنامه</span>
        <input className={inp} inputMode="numeric" value={v.birthCertNo || ''} onChange={(e) => set('birthCertNo', e.target.value)} />
      </label>
      <label className="block">
        <span className={lbl}>محل صدور</span>
        <input className={inp} value={v.issuePlace || ''} onChange={(e) => set('issuePlace', e.target.value)} />
      </label>
      <div className="block sm:col-span-2">
        <span className={lbl}>تاریخ تولد</span>
        <JalaliDateInput value={v.birthDate} onChange={(x) => set('birthDate', x)} minYear={1300} maxYear={1395} />
      </div>
    </>
  );
}

/** مدارک خودرو در قولنامه: شماره کارت، شماره سند، بیمه‌نامه */
export function ContractCarDocs({ value, onChange }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-black">مدارک خودرو</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className={lbl}>شماره (سریال) کارت خودرو</span>
          <input className={inp} value={v.cardNo || ''} onChange={(e) => set('cardNo', e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>شماره سند / برگ سبز</span>
          <input className={inp} value={v.documentNo || ''} onChange={(e) => set('documentNo', e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>شرکت بیمه</span>
          <input className={inp} value={v.insurer || ''} onChange={(e) => set('insurer', e.target.value)} placeholder="مثلاً بیمه ایران" />
        </label>
        <label className="block">
          <span className={lbl}>شماره بیمه‌نامه شخص ثالث</span>
          <input className={inp} inputMode="numeric" value={v.insurancePolicyNo || ''} onChange={(e) => set('insurancePolicyNo', e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>سال‌های تخفیف بیمه</span>
          <input className={inp} inputMode="numeric" value={v.insuranceDiscountYears || ''} onChange={(e) => set('insuranceDiscountYears', e.target.value)} />
        </label>
        <div className="block">
          <span className={lbl}>انقضای بیمه‌نامه</span>
          <JalaliDateInput value={v.insuranceExpiry} onChange={(x) => set('insuranceExpiry', x)} />
        </div>
      </div>
    </section>
  );
}
