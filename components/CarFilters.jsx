'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CAR_STATUS, OWNERSHIP } from '@/lib/constants';
import Icon from './Icon';

const PRICE_RANGES = {
  '': 'همه قیمت‌ها',
  '0-500': 'تا ۵۰۰ میلیون',
  '500-1000': '۵۰۰ میلیون تا ۱ میلیارد',
  '1000-2000': '۱ تا ۲ میلیارد',
  '2000-3000': '۲ تا ۳ میلیارد',
  '3000-': 'بالای ۳ میلیارد',
};
const KM = { '': 'هر کارکردی', 20000: 'تا ۲۰ هزار کیلومتر', 50000: 'تا ۵۰ هزار', 100000: 'تا ۱۰۰ هزار', 150000: 'تا ۱۵۰ هزار' };
const SORTS = { newest: 'جدیدترین', stale: 'بیشترین ماندگاری', price: 'ارزان‌ترین', priceDesc: 'گران‌ترین', km: 'کمترین کارکرد' };

export default function CarFilters({ brands = [], colors = [] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const set = (k, v) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(`/cars?${p.toString()}`);
  };
  const sel = (k, opts, def = '') => (
    <select className="input" value={sp.get(k) || def} onChange={(e) => set(k, e.target.value)}>
      {Object.entries(opts).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );

  return (
    <div className="card mb-6 p-3 sm:p-4">
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          set('q', q.trim());
        }}
      >
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input className="input pr-10" placeholder="جستجوی مدل، شاسی یا پلاک…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-dark">جستجو</button>
      </form>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {sel('status', { active: 'موجودی فعال', all: 'همه وضعیت‌ها', ...Object.fromEntries(Object.entries(CAR_STATUS).map(([k, v]) => [k, v.label])) }, 'active')}
        {sel('brand', { '': 'همه برندها', ...Object.fromEntries(brands.map((b) => [b, b])) })}
        {sel('color', { '': 'همه رنگ‌ها', ...Object.fromEntries(colors.filter(Boolean).map((b) => [b, b])) })}
        {sel('price', PRICE_RANGES)}
        {sel('maxKm', KM)}
        {sel('ownership', { '': 'ملکی و امانی', ...OWNERSHIP })}
        {sel('sort', SORTS, 'newest')}
      </div>
    </div>
  );
}
