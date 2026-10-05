'use client';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatNumber, priceShort, toFa, toEnDigits, parseNumber, normalizeFa } from '@/lib/persian';
import { MARKET_SOURCES, PRICE_TYPES, STALE_DAYS, sourceLabel } from '@/lib/marketSources';
import { Section, Empty, Field, Badge } from './ui';
import { MoneyInput, NumberInput, JalaliDateInput, ErrorText, Toggle } from './inputs';
import { useSaver } from './useSaver';
import Icon from './Icon';

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const ageDays = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0);
const typeCls = (t) => (t === 'deal' ? 'bg-cash-soft text-cash' : 'bg-plate-soft text-plate');

export const EMPTY_PRICE = {
  type: 'ad',
  source: 'colleague',
  sourceName: '',
  link: '',
  brand: '',
  model: '',
  trim: '',
  year: '',
  mileage: 0,
  color: '',
  price: 0,
  city: '',
  date: null,
  note: '',
  active: true,
};

/* ───────── فرم ثبت / ویرایش قیمت ───────── */
export function PriceForm({ initial, suggestions = {}, onDone }) {
  const editing = Boolean(initial?._id);
  const [f, setF] = useState(() => ({ ...EMPTY_PRICE, date: new Date().toISOString(), ...(initial || {}) }));
  const [savedCount, setSavedCount] = useState(0);
  const s = useSaver();
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const brands = Object.keys(suggestions);
  const models = suggestions[f.brand] || [];

  const valid = f.brand.trim() && f.model.trim() && Number(toEnDigits(f.year)) > 1300 && f.price >= 1_000_000;

  const save = (again) =>
    s.run(async () => {
      const body = { ...f, year: Number(toEnDigits(f.year)) };
      if (editing) await api(`/api/market-prices/${initial._id}`, 'PATCH', body);
      else await api('/api/market-prices', 'POST', body);
      if (again) {
        // برند/مدل/سال/منبع حفظ می‌شود تا ثبت قیمت بعدی سریع باشد
        setF((p) => ({ ...p, price: 0, mileage: 0, color: '', note: '', link: '' }));
        setSavedCount((n) => n + 1);
      } else onDone?.();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save(false);
      }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle options={PRICE_TYPES} value={f.type} onChange={(v) => set('type', v)} />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-plate" checked={f.active !== false} onChange={(e) => set('active', e.target.checked)} />
          در محاسبهٔ قیمت بازار شرکت کند
        </label>
      </div>

      <div>
        <div className="label">منبع قیمت</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MARKET_SOURCES).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => set('source', k)}
              className={`chip border transition ${f.source === k ? 'border-asphalt-900 bg-asphalt-900 text-white' : 'border-line bg-white text-ink-soft hover:border-ink-mute/40'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={f.source === 'colleague' ? 'نام نمایشگاه' : 'نام پیج / سایت / شخص'} hint="اختیاری">
          <input className="input" value={f.sourceName} onChange={(e) => set('sourceName', e.target.value)} placeholder={f.source === 'colleague' ? 'مثلاً نمایشگاه ستاره' : 'مثلاً @autogallery'} />
        </Field>
        <Field label="لینک آگهی" hint="اختیاری">
          <input className="input text-left" dir="ltr" value={f.link} onChange={(e) => set('link', e.target.value)} placeholder="https://" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="برند *">
          <input className="input" list="mp-brands" value={f.brand} onChange={(e) => set('brand', e.target.value)} placeholder="مثلاً پژو" autoFocus={!editing} />
          <datalist id="mp-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <Field label="مدل *">
          <input className="input" list="mp-models" value={f.model} onChange={(e) => set('model', e.target.value)} placeholder="مثلاً 206 تیپ 2" />
          <datalist id="mp-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="سال ساخت *">
          <input className="input num text-left" dir="ltr" inputMode="numeric" maxLength={4} value={toFa(f.year)} onChange={(e) => set('year', toEnDigits(e.target.value).replace(/\D/g, ''))} placeholder="۱۴۰۰" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="کارکرد">
          <NumberInput value={f.mileage} onChange={(v) => set('mileage', v)} suffix="کیلومتر" placeholder="۰" />
        </Field>
        <Field label="رنگ">
          <input className="input" value={f.color} onChange={(e) => set('color', e.target.value)} placeholder="سفید" />
        </Field>
        <Field label="تیپ / توضیح کوتاه">
          <input className="input" value={f.trim} onChange={(e) => set('trim', e.target.value)} placeholder="مثلاً فول" />
        </Field>
      </div>

      <Field label={f.type === 'deal' ? 'مبلغ معامله *' : 'قیمت اعلامی *'}>
        <MoneyInput value={f.price} onChange={(v) => set('price', v)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="تاریخ مشاهده قیمت">
          <JalaliDateInput value={f.date} onChange={(v) => set('date', v)} />
        </Field>
        <Field label="شهر">
          <input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="تهران" />
        </Field>
      </div>

      <Field label="یادداشت">
        <textarea className="input min-h-[72px]" value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="مثلاً: قابل چانه، رنگ‌شدگی دارد، بیمه کامل…" />
      </Field>

      <ErrorText error={s.err} />
      {savedCount > 0 && !s.err && (
        <div className="rounded-xl bg-cash-soft px-3 py-2 text-sm font-semibold text-cash">
          {toFa(savedCount)} قیمت ثبت شد. قیمت بعدی همین مدل را وارد کن.
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-line bg-card px-5 pt-4 sm:-mx-6 sm:flex-row sm:px-6">
        {!editing && (
          <button type="button" disabled={!valid || s.busy} onClick={() => save(true)} className="btn-ghost w-full sm:w-auto">
            <Icon name="plus" size={18} /> ذخیره و ثبت بعدی
          </button>
        )}
        <button type="submit" disabled={!valid || s.busy} className="btn-primary w-full sm:flex-1">
          <Icon name="check" size={18} /> {s.busy ? 'در حال ذخیره…' : editing ? 'ذخیره تغییرات' : 'ذخیره قیمت'}
        </button>
      </div>
    </form>
  );
}

/* ───────── ورود گروهی (کپی از واتساپ/تلگرام/اکسل) ───────── */
function parsePrice(raw) {
  const t = toEnDigits(raw).replace(/[٬,]/g, '').replace(/[٫\/]/g, '.');
  let n = parseNumber(t);
  if (/میلیارد/.test(t)) n *= 1e9;
  else if (/میلیون|م$/.test(t.trim())) n *= 1e6;
  else if (n > 0 && n < 100_000) n *= 1e6; // «۶۱۰» یعنی ۶۱۰ میلیون
  return Math.round(n);
}
export function parseBulk(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      // اگر | یا Tab داشت فقط با همان جدا کن (تا ویرگول هزارگان قیمت خراب نشود)
      const p = (/[\t|]/.test(line) ? line.split(/\t|\|/) : line.split(/،|,|؛|;/)).map((x) => x.trim());
      const [brand = '', model = '', year = '', mileage = '', price = '', color = ''] = p;
      const row = { line: i + 1, raw: line, brand, model, year: Number(toEnDigits(year).replace(/\D/g, '')), mileage: parseNumber(mileage), price: parsePrice(price), color };
      row.ok = Boolean(row.brand && row.model && row.year > 1300 && row.price >= 1_000_000);
      return row;
    });
}

export function BulkImport({ onDone }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('ad');
  const [source, setSource] = useState('colleague');
  const [sourceName, setSourceName] = useState('');
  const s = useSaver();
  const rows = useMemo(() => parseBulk(text), [text]);
  const good = rows.filter((r) => r.ok);
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-paper p-3 text-sm leading-7 text-ink-soft">
        هر خودرو در یک خط، به ترتیب: <b>برند | مدل | سال | کارکرد | قیمت | رنگ</b>
        <br />
        جداکننده می‌تواند <span className="num">| ، , Tab</span> باشد. قیمت را می‌توانی کامل یا مثل «۶۱۰ میلیون» یا «۱٫۲ میلیارد» بنویسی.
        <div className="num mt-1 text-xs text-ink-mute" dir="rtl">پژو | 206 تیپ 2 | 1399 | 90000 | 610 میلیون | سفید</div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle options={PRICE_TYPES} value={type} onChange={setType} />
        <select className="input w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
          {Object.entries(MARKET_SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input className="input min-w-0 flex-1" value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="نام منبع (اختیاری)" />
      </div>
      <textarea className="input num min-h-[160px] leading-7" value={text} onChange={(e) => setText(e.target.value)} placeholder="فهرست قیمت‌ها را اینجا بچسبان…" />
      {rows.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-line">
          {rows.map((r) => (
            <div key={r.line} className={`flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 text-sm last:border-0 ${r.ok ? '' : 'bg-alarm-soft/50'}`}>
              <span className="font-semibold">{toFa(r.line)}. {r.brand} {toFa(r.model)} {toFa(r.year || '')}</span>
              {r.ok ? <span className="num font-bold text-plate">{priceShort(r.price)} · {formatNumber(r.mileage)} km</span> : <span className="font-bold text-alarm">ناقص — رد می‌شود</span>}
            </div>
          ))}
        </div>
      )}
      <ErrorText error={s.err} />
      <button
        disabled={!good.length || s.busy}
        onClick={() =>
          s.run(async () => {
            const date = new Date().toISOString();
            await api('/api/market-prices', 'POST', { items: good.map(({ brand, model, year, mileage, price, color }) => ({ brand, model, year, mileage, price, color, type, source, sourceName, date })) });
            onDone?.();
          })
        }
        className="btn-primary w-full"
      >
        {s.busy ? 'در حال ثبت…' : `ثبت ${toFa(good.length)} قیمت`}
      </button>
    </div>
  );
}

/* ───────── فهرست قیمت‌های دستی ───────── */
export default function MarketPricesPanel({ prices, onAdd, onEdit, onBulk }) {
  const [q, setQ] = useState('');
  const [source, setSource] = useState('all');
  const [type, setType] = useState('all');
  const [showOff, setShowOff] = useState(true);
  const s = useSaver();

  const list = useMemo(() => {
    const nq = normalizeFa(q);
    return prices.filter(
      (p) =>
        (!nq || normalizeFa(`${p.brand}${p.model}${p.year}${p.color || ''}${p.sourceName || ''}${p.city || ''}`).includes(nq)) &&
        (source === 'all' || p.source === source) &&
        (type === 'all' || p.type === type) &&
        (showOff || p.active !== false)
    );
  }, [prices, q, source, type, showOff]);

  // خلاصه به تفکیک برند/مدل/سال
  const groups = useMemo(() => {
    const g = {};
    for (const p of list) {
      if (p.active === false) continue;
      const k = `${normalizeFa(p.brand)}|${normalizeFa(p.model)}|${p.year}`;
      g[k] = g[k] || { brand: p.brand, model: p.model, year: p.year, prices: [], last: 0 };
      g[k].prices.push(p.price);
      g[k].last = Math.max(g[k].last, new Date(p.date || p.createdAt).getTime());
    }
    return Object.values(g)
      .map((x) => ({ ...x, count: x.prices.length, median: median(x.prices), min: Math.min(...x.prices), max: Math.max(...x.prices) }))
      .sort((a, b) => b.last - a.last);
  }, [list]);

  const toggle = (p) => s.run(() => api(`/api/market-prices/${p._id}`, 'PATCH', { active: p.active === false }));
  const remove = (p) => {
    if (!window.confirm(`قیمت ${p.brand} ${p.model} ${p.year} حذف شود؟`)) return;
    s.run(() => api(`/api/market-prices/${p._id}`, 'DELETE'));
  };
  const dup = (p) => onAdd?.({ ...p, _id: undefined, price: 0, mileage: 0, color: '', note: '', link: '', date: new Date().toISOString(), createdAt: undefined, updatedAt: undefined });

  return (
    <div className="space-y-5">
      <div className="card p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input className="input pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="برند، مدل، سال، نمایشگاه یا شهر…" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select className="input sm:w-40" value={source} onChange={(e) => setSource(e.target.value)} aria-label="منبع">
              <option value="all">همهٔ منابع</option>
              {Object.entries(MARKET_SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select className="input sm:w-36" value={type} onChange={(e) => setType(e.target.value)} aria-label="نوع">
              <option value="all">آگهی و معامله</option>
              {Object.entries(PRICE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 px-1 text-sm font-semibold text-ink-soft">
            <input type="checkbox" className="h-4 w-4 accent-plate" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} />
            نمایش غیرفعال‌ها
          </label>
        </div>
      </div>

      {groups.length > 0 && (
        <Section title="خلاصهٔ قیمت‌های ثبت‌شده">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groups.slice(0, 9).map((g) => (
              <div key={`${g.brand}${g.model}${g.year}`} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-extrabold">{g.brand} {toFa(g.model)} <span className="text-ink-mute">{toFa(g.year)}</span></div>
                  <Badge>{toFa(g.count)} قیمت</Badge>
                </div>
                <div className="num mt-2 text-lg font-black text-plate">{priceShort(g.median)} <span className="text-xs font-semibold text-ink-mute">میانه</span></div>
                <div className="num mt-0.5 text-sm text-ink-mute">از {priceShort(g.min)} تا {priceShort(g.max)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title={`قیمت‌های من (${toFa(list.length)})`}
        action={
          <div className="flex gap-2">
            <button onClick={onBulk} className="btn-ghost px-3"><Icon name="download" size={18} /> <span className="hidden sm:inline">ورود گروهی</span></button>
            <button onClick={() => onAdd?.()} className="btn-primary px-3"><Icon name="plus" size={18} /> ثبت قیمت</button>
          </div>
        }
      >
        <ErrorText error={s.err} />
        {!list.length ? (
          <Empty>
            هنوز قیمتی ثبت نکرده‌ای. قیمت‌هایی که از نمایشگاه‌های همکار، دیوار، باما یا فضای مجازی می‌گیری را اینجا ثبت کن تا در مقایسهٔ بازار حساب شوند.
          </Empty>
        ) : (
          <>
            {/* دسکتاپ: جدول */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right text-[15px]">
                <thead>
                  <tr className="border-b border-line text-sm text-ink-mute">
                    <th className="py-2 pl-3 font-semibold">خودرو</th>
                    <th className="py-2 pl-3 font-semibold">کارکرد</th>
                    <th className="py-2 pl-3 font-semibold">قیمت</th>
                    <th className="py-2 pl-3 font-semibold">منبع</th>
                    <th className="py-2 pl-3 font-semibold">تاریخ</th>
                    <th className="py-2 font-semibold"><span className="sr-only">عملیات</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((p) => (
                    <PriceRow key={p._id} p={p} onEdit={onEdit} onDup={dup} onToggle={toggle} onDelete={remove} busy={s.busy} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* موبایل: کارت */}
            <div className="divide-y divide-line md:hidden">
              {list.map((p) => (
                <PriceCard key={p._id} p={p} onEdit={onEdit} onDup={dup} onToggle={toggle} onDelete={remove} busy={s.busy} />
              ))}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

function Meta({ p }) {
  const old = ageDays(p.date) > STALE_DAYS;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge cls={typeCls(p.type)}>{p.type === 'deal' ? 'معامله' : 'آگهی'}</Badge>
      {p.active === false && <Badge cls="bg-paper text-ink-mute">غیرفعال</Badge>}
      {old && <Badge cls="bg-road-soft text-asphalt-900">قدیمی</Badge>}
    </div>
  );
}

function SourceText({ p }) {
  return (
    <span>
      {sourceLabel(p.source)}
      {p.sourceName && <span className="text-ink-mute"> · {p.sourceName}</span>}
      {p.city && <span className="text-ink-mute"> · {p.city}</span>}
      {p.link && (
        <a href={p.link} target="_blank" rel="noopener noreferrer" className="mr-1 font-bold text-plate hover:underline">
          لینک
        </a>
      )}
    </span>
  );
}

function Actions({ p, onEdit, onDup, onToggle, onDelete, busy }) {
  const b = 'grid h-9 w-9 place-items-center rounded-lg text-ink-mute transition hover:bg-paper hover:text-ink disabled:opacity-40';
  return (
    <div className="flex items-center gap-0.5">
      <button className={b} onClick={() => onEdit?.(p)} title="ویرایش" aria-label="ویرایش"><Icon name="edit" size={18} /></button>
      <button className={b} onClick={() => onDup(p)} title="ثبت قیمت مشابه" aria-label="ثبت قیمت مشابه"><Icon name="plus" size={18} /></button>
      <button className={b} disabled={busy} onClick={() => onToggle(p)} title={p.active === false ? 'فعال کردن' : 'غیرفعال کردن'} aria-label="فعال/غیرفعال">
        <Icon name={p.active === false ? 'check' : 'close'} size={18} />
      </button>
      <button className={`${b} hover:bg-alarm-soft hover:text-alarm`} disabled={busy} onClick={() => onDelete(p)} title="حذف" aria-label="حذف"><Icon name="trash" size={18} /></button>
    </div>
  );
}

function PriceRow({ p, ...rest }) {
  return (
    <tr className={p.active === false ? 'opacity-55' : ''}>
      <td className="py-3 pl-3">
        <div className="font-extrabold">{p.brand} {toFa(p.model)} {p.trim && <span className="font-semibold text-ink-soft">{p.trim}</span>} <span className="text-ink-mute">{toFa(p.year)}</span></div>
        <div className="mt-1 flex items-center gap-2 text-sm text-ink-mute"><Meta p={p} />{p.color}</div>
        {p.note && <div className="mt-1 max-w-sm truncate text-sm text-ink-mute" title={p.note}>{p.note}</div>}
      </td>
      <td className="num py-3 pl-3 text-ink-soft">{p.mileage ? formatNumber(p.mileage) : '—'}</td>
      <td className="num py-3 pl-3 font-black text-plate" title={formatNumber(p.price) + ' تومان'}>{priceShort(p.price)}</td>
      <td className="py-3 pl-3 text-sm"><SourceText p={p} /></td>
      <td className="py-3 pl-3 text-sm text-ink-soft">{formatDate(p.date)}</td>
      <td className="py-3"><Actions p={p} {...rest} /></td>
    </tr>
  );
}

function PriceCard({ p, ...rest }) {
  return (
    <div className={`py-4 ${p.active === false ? 'opacity-55' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-extrabold">{p.brand} {toFa(p.model)} <span className="text-ink-mute">{toFa(p.year)}</span></div>
          <div className="mt-1.5"><Meta p={p} /></div>
        </div>
        <div className="shrink-0 text-left">
          <div className="num text-lg font-black text-plate">{priceShort(p.price)}</div>
          <div className="num text-xs text-ink-mute">{p.mileage ? `${formatNumber(p.mileage)} km` : ''}</div>
        </div>
      </div>
      <div className="mt-2 text-sm"><SourceText p={p} /></div>
      {p.note && <div className="mt-1 text-sm text-ink-mute">{p.note}</div>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-ink-mute">{formatDate(p.date)}{p.color ? ` · ${p.color}` : ''}</span>
        <Actions p={p} {...rest} />
      </div>
    </div>
  );
}
