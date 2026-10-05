import Link from 'next/link';
import { CAR_STATUS, LEAD_STATUS, CHEQUE_STATUS } from '@/lib/constants';
import { formatNumber, priceWords, priceShort, toFa } from '@/lib/persian';

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-black leading-tight tracking-tight sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-mute">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Section({ title, action, children, className = '', tone }) {
  return (
    <section className={`card p-4 sm:p-5 ${tone === 'alarm' ? 'border-alarm/30' : ''} ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="h-section">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-sm text-ink-mute">{hint}</span>}
    </label>
  );
}

export function Empty({ children, icon = '—' }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[15px] text-ink-mute">{children}</div>;
}

export function Badge({ cls = 'bg-paper text-ink-soft', children }) {
  return <span className={`chip ${cls}`}>{children}</span>;
}

export function CarStatusBadge({ status }) {
  const s = CAR_STATUS[status] || CAR_STATUS.available;
  return <Badge cls={s.cls}>{s.label}</Badge>;
}
export function LeadStatusBadge({ status }) {
  const s = LEAD_STATUS[status] || LEAD_STATUS.new;
  return <Badge cls={s.cls}>{s.label}</Badge>;
}
export function ChequeStatusBadge({ status }) {
  const s = CHEQUE_STATUS[status] || CHEQUE_STATUS.pending;
  return <Badge cls={s.cls}>{s.label}</Badge>;
}

/** نمایش مبلغ با رقم و حروف */
export function Money({ value, words = true, size = 'md', tone, className = '' }) {
  if (value === null || value === undefined) return <span className="text-ink-mute">—</span>;
  const color = tone === 'auto' ? (value < 0 ? 'text-alarm' : 'text-cash') : tone === 'alarm' ? 'text-alarm' : tone === 'cash' ? 'text-cash' : '';
  const sz = size === 'xl' ? 'text-3xl sm:text-4xl font-black' : size === 'lg' ? 'text-2xl font-extrabold' : size === 'sm' ? 'text-[15px] font-bold' : 'text-lg font-extrabold';
  return (
    <span className={`block ${className}`}>
      <span className={`num block tracking-tight ${sz} ${color}`}>
        {formatNumber(value)} <span className="text-[0.6em] font-semibold text-ink-mute">تومان</span>
      </span>
      {words && value !== 0 && <span className="mt-0.5 block text-sm leading-6 text-ink-mute">{priceWords(value)}</span>}
    </span>
  );
}

export function Short({ value, className = '' }) {
  return <span className={`num ${className}`}>{priceShort(value)}</span>;
}

/** پلاک ایرانی */
export function Plate({ plate, size = 'md' }) {
  const p = plate || {};
  if (!p.p1 && !p.p2) return <span className="text-sm text-ink-mute">بدون پلاک</span>;
  const fs = size === 'lg' ? 24 : size === 'sm' ? 14 : 17;
  return (
    <span dir="ltr" className="inline-flex select-none items-stretch overflow-hidden rounded-[6px] border-[2px] border-asphalt-900 bg-white font-black leading-none text-asphalt-900" style={{ fontSize: fs }} title="پلاک">
      <span className="flex w-[1.25em] flex-col items-center justify-between bg-plate py-[0.18em] text-white">
        <span className="flex h-[0.5em] w-[0.7em] flex-col overflow-hidden rounded-[1px]">
          <span className="flex-1 bg-[#239f40]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#da0000]" />
        </span>
        <span className="flex flex-col items-center font-bold" style={{ fontSize: '0.26em', lineHeight: 1.1 }}>
          <span>I.R.</span>
          <span>IRAN</span>
        </span>
      </span>
      <span className="flex items-center gap-[0.32em] px-[0.45em] py-[0.32em]">
        <span>{toFa(p.p1)}</span>
        <span className="font-bold">{p.letter}</span>
        <span>{toFa(p.p2)}</span>
      </span>
      <span className="flex flex-col items-center justify-center border-l-[2px] border-asphalt-900 px-[0.35em]">
        <span className="font-bold" style={{ fontSize: '0.42em' }}>ایران</span>
        <span>{toFa(p.region)}</span>
      </span>
    </span>
  );
}

/** پارکومتر: روزهای ماندگاری در پارکینگ نسبت به آستانهٔ خواب سرمایه */
export function StayMeter({ days, threshold = 45, compact = false }) {
  const ratio = Math.min(days / threshold, 1.25);
  const tone = ratio >= 1 ? 'bg-alarm' : ratio >= 0.66 ? 'bg-road' : 'bg-cash';
  const label = ratio >= 1 ? 'خواب سرمایه' : ratio >= 0.66 ? 'نزدیک به خواب' : 'گردش خوب';
  return (
    <div className={compact ? '' : 'min-w-[150px]'}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold num">
          {toFa(days)} <span className="font-medium text-ink-mute">روز در پارکینگ</span>
        </span>
        {!compact && <span className={ratio >= 1 ? 'font-bold text-alarm' : 'text-ink-mute'}>{label}</span>}
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-paper">
        <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${Math.min(ratio / 1.25, 1) * 100}%` }} />
        <span className="absolute inset-y-0 w-0.5 bg-asphalt-900/50" style={{ right: `${(1 / 1.25) * 100}%` }} title="آستانهٔ خواب" />
      </div>
    </div>
  );
}

export function Kv({ k, v, strong }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[15px] text-ink-mute">{k}</span>
      <span className={`min-w-0 break-words text-left text-[15px] ${strong ? 'font-extrabold' : 'font-semibold'}`}>{v}</span>
    </div>
  );
}

export function CarTitle({ car, href = true }) {
  const t = `${car.brand} ${car.model}${car.trim ? ' ' + car.trim : ''}`;
  const node = (
    <span className="font-extrabold">
      {toFa(t)} <span className="font-semibold text-ink-mute">{toFa(car.year || '')}</span>
    </span>
  );
  return href ? (
    <Link href={`/cars/${car._id}`} className="hover:text-plate">
      {node}
    </Link>
  ) : (
    node
  );
}
