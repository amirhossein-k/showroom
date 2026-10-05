'use client';
import { useEffect, useId, useState } from 'react';
import { useDialog } from './useDialog';
import { formatNumber, parseNumber, priceWords, toFa } from '@/lib/persian';
import { toJalali, jalaliToDate, jalaliMonthLength, JALALI_MONTHS } from '@/lib/jalali';
import Icon from './Icon';

/** ورودی مبلغ: جداکننده هزارگان + نمایش زندهٔ مبلغ به حروف */
export function MoneyInput({ value, onChange, placeholder = 'مثلاً ۷۵۰٬۰۰۰٬۰۰۰', words = true, autoFocus, ariaLabel }) {
  const v = Number(value) || 0;
  return (
    <div>
      <div className="relative">
        <input
          dir="ltr"
          inputMode="numeric"
          aria-label={ariaLabel}
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
    setSt(value ? toJalali(value) : { jy: '', jm: '', jd: '' });
  }, [value]);

  const years = [];
  for (let y = Math.max(maxYear || nowJ.jy + 2, Number(st.jy) || 0); y >= Math.min(minYear || nowJ.jy - 6, Number(st.jy) || nowJ.jy); y--) years.push(y);
  const maxDay = st.jy && st.jm ? jalaliMonthLength(Number(st.jy), Number(st.jm)) : 31;

  const update = (patch) => {
    const n = { ...st, ...patch };
    if (n.jd && n.jy && n.jm && n.jd > jalaliMonthLength(Number(n.jy), Number(n.jm))) n.jd = jalaliMonthLength(Number(n.jy), Number(n.jm));
    setSt(n);
    if (n.jy && n.jm && n.jd) onChange(jalaliToDate(Number(n.jy), Number(n.jm), Number(n.jd)).toISOString());
    else onChange(null);
  };

  return (
    <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.3fr)_minmax(0,1fr)] gap-1.5 sm:flex">
      <select className="input min-w-0 px-2 sm:w-[72px]" value={st.jd} onChange={(e) => update({ jd: Number(e.target.value) || '' })} aria-label="روز">
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
      <select className="input min-w-0 px-2 sm:w-[88px]" value={st.jy} onChange={(e) => update({ jy: Number(e.target.value) || '' })} aria-label="سال">
        <option value="">سال</option>
        {years.map((y) => (
          <option key={y} value={y}>{toFa(y)}</option>
        ))}
      </select>
      <button type="button" className="btn-ghost col-span-3 shrink-0 px-3" onClick={() => update(toJalali(new Date()))} title="امروز">
        امروز
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  const titleId = useId();
  const dialogRef = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-asphalt-950/55 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`dialog-panel relative w-full animate-rise overflow-y-auto overscroll-contain rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h3 id={titleId} className="text-xl font-black">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-mute hover:bg-paper" aria-label="بستن">
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
  return <div role="alert" className="break-words rounded-xl bg-alarm-soft px-3 py-2 text-[15px] font-semibold text-alarm">{error}</div>;
}

export function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-xl border border-line bg-paper p-1" role="group">
      {Object.entries(options).map(([k, label]) => (
        <button
          type="button"
          key={k}
          aria-pressed={value === k}
          onClick={() => onChange ? onChange(k) : (window.location.href = `${window.location.pathname}?period=${k}`)}
          className={`rounded-lg px-3.5 py-2 text-sm font-bold transition ${value === k ? 'bg-asphalt-900 text-white shadow' : 'text-ink-soft hover:text-ink'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
