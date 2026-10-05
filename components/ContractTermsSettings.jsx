'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MoneyInput, NumberInput } from './inputs';
import { DEFAULT_TERMS, isValidNationalId } from '@/lib/contractDefaults';

/** تنظیمات قولنامه — در app/settings/page.js زیر بقیه بگذار: <ContractTermsSettings /> */
export default function ContractTermsSettings() {
  const [s, setS] = useState(null);
  const [terms, setTerms] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api('/api/settings')
      .then((x) => {
        setS(x);
        setTerms((x.contractTerms?.length ? x.contractTerms : DEFAULT_TERMS).join('\n'));
      })
      .catch((e) => setMsg(e.message));
  }, []);
  if (!s) return <div className="text-sm text-ink-mute">{msg || 'در حال بارگذاری…'}</div>;
  const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const save = async () => {
    setMsg('');
    if (s.ownerNationalId && !isValidNationalId(s.ownerNationalId)) return setMsg('کد ملی مدیر معتبر نیست.');
    try {
      await api('/api/settings', 'PUT', {
        contractTerms: terms.split('\n').map((t) => t.trim()).filter(Boolean),
        ownerFatherName: s.ownerFatherName,
        ownerNationalId: s.ownerNationalId,
        contractCity: s.contractCity,
        defaultPenaltyPerDay: Number(s.defaultPenaltyPerDay) || 0,
        defaultTransferDays: Number(s.defaultTransferDays) || 30,
      });
      setMsg('ذخیره شد ✅');
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-black">پیش‌فرض‌های قولنامه</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">نام پدر مدیر<input className={inp} value={s.ownerFatherName || ''} onChange={set('ownerFatherName')} /></label>
        <label className="block text-sm">کد ملی مدیر (فروشنده)<input className={inp} dir="ltr" maxLength={10} value={s.ownerNationalId || ''} onChange={set('ownerNationalId')} /></label>
        <label className="block text-sm">محل تنظیم قرارداد<input className={inp} value={s.contractCity || ''} onChange={set('contractCity')} placeholder="مثلاً تهران" /></label>
        <label className="block text-sm">مهلت پیش‌فرض انتقال سند<NumberInput value={s.defaultTransferDays ?? 30} onChange={(v) => setS({ ...s, defaultTransferDays: v })} suffix="روز" /></label>
        <label className="block text-sm sm:col-span-2">وجه التزام روزانه پیش‌فرض<MoneyInput value={s.defaultPenaltyPerDay || 0} onChange={(v) => setS({ ...s, defaultPenaltyPerDay: v })} /></label>
        <label className="block text-sm sm:col-span-2">
          بندهای پیش‌فرض (هر خط یک بند)
          <textarea className={`${inp} leading-7`} rows={10} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} className="rounded-lg bg-asphalt-900 px-4 py-2 text-sm font-bold text-white">ذخیره</button>
        <button onClick={() => setTerms(DEFAULT_TERMS.join('\n'))} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold">بازگردانی بندهای اصلی</button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </section>
  );
}
