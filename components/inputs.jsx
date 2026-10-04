'use client';
import { useEffect, useState } from 'react';
import { formatNumber, parseNumber, priceWords, toFa } from '@/lib/persian';
import { toJalali, jalaliToDate, jalaliMonthLength, JALALI_MONTHS } from '@/lib/jalali';
import Icon from './Icon';

/** ورودی مبلغ: جداکننده هزارگان + نمایش زندهٔ مبلغ به حروف */
export function MoneyInput({ value, onChange, placeholder = 'مثلاً ۷۵۰٬۰۰۰٬۰۰۰', words = true, autoFocus }) {
  const v = Number(value) || 0;
  return (
    <div>
      <div className="relative">
        <input
          dir="ltr"
          inputMode="numeric"
          autoFocus={autoFocus}
          className="input num pl-16 text-left text-base font-bold"
          placeholder={placeholder}
          value={v ? formatNumber(v) : ''}
          onChange={(e) => onChange(parseNumber(e.target.value))}
        />
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-mute">تومان</span>
      </div>
      {words && <div className={`mt-1 min-h-[24px] text-sm leading-6 ${v ? 'font-semibold text-plate' : 'text-ink-mute/70'}`}>{v ? priceWords(v) : 'مبلغ به حروف اینجا نمایش داده می‌شود'}</div>}
    </div>
  );
}

export function NumberInput({ value, onChange, placeholder, suffix }) {
  const v = Number(value) || 0;
  return (
    <div className="relative">
      <input dir="ltr" inputMode="numeric" className={`input num text-left ${suffix ? 'pl-14' : ''}`} placeholder={placeholder} value={v ? formatNumber(v) : ''} onChange={(e) => onChange(parseNumber(e.target.value))} />
      {suffix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-mute">{suffix}</span>}
    </div>
  );
}

/** انتخاب تاریخ شمسی (روز/ماه/سال) — خروجی: تاریخ میلادی ISO */
export function JalaliDateInput({ value, onChange, minYear, maxYear }) {
  const nowJ = toJalali(new Date());
  const init = value ? toJalali(value) : { jy: '', jm: '', jd: '' };
  const [st, setSt] = useState(init);
  useEffect(() => {
    if (value) setSt(toJalali(value));
  }, [value]);

  const years = [];
  for (let y = maxYear || nowJ.jy + 2; y >= (minYear || nowJ.jy - 6); y--) years.push(y);
  const maxDay = st.jy && st.jm ? jalaliMonthLength(Number(st.jy), Number(st.jm)) : 31;

  const update = (patch) => {
    const n = { ...st, ...patch };
    if (n.jd && n.jy && n.jm && n.jd > jalaliMonthLength(Number(n.jy), Number(n.jm))) n.jd = jalaliMonthLength(Number(n.jy), Number(n.jm));
    setSt(n);
    if (n.jy && n.jm && n.jd) onChange(jalaliToDate(Number(n.jy), Number(n.jm), Number(n.jd)).toISOString());
    else onChange(null);
  };

  return (
    <div className="flex gap-1.5">
      <select className="input w-[72px] px-2" value={st.jd} onChange={(e) => update({ jd: Number(e.target.value) || '' })} aria-label="روز">
        <option value="">روز</option>
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{toFa(d)}</option>
        ))}
      </select>
      <select className="input min-w-0 flex-1 px-2" value={st.jm} onChange={(e) => update({ jm: Number(e.target.value) || '' })} aria-label="ماه">
        <option value="">ماه</option>
        {JALALI_MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select className="input w-[88px] px-2" value={st.jy} onChange={(e) => update({ jy: Number(e.target.value) || '' })} aria-label="سال">
        <option value="">سال</option>
        {years.map((y) => (
          <option key={y} value={y}>{toFa(y)}</option>
        ))}
      </select>
      <button type="button" className="btn-ghost shrink-0 px-3" onClick={() => update(toJalali(new Date()))} title="امروز">
        امروز
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-asphalt-950/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full animate-rise overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-black">{title}</h3>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl text-ink-mute hover:bg-paper" aria-label="بستن">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ error }) {
  if (!error) return null;
  return <div className="rounded-xl bg-alarm-soft px-3 py-2 text-[15px] font-semibold text-alarm">{error}</div>;
}

export function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-paper p-1">
      {Object.entries(options).map(([k, label]) => (
        <button
          type="button"
          key={k}
          onClick={() => onChange ? onChange(k) : (window.location.href = `${window.location.pathname}?period=${k}`)}
          className={`rounded-lg px-3.5 py-2 text-sm font-bold transition ${value === k ? 'bg-asphalt-900 text-white shadow' : 'text-ink-soft hover:text-ink'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
