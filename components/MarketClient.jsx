'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { priceShort, formatDate, toFa } from '@/lib/persian';
import { PageHeader, Section, Empty, CarTitle, Badge } from './ui';
import { Modal } from './inputs';
import Icon from './Icon';
import MarketPricesPanel, { PriceForm, BulkImport } from './MarketPricesManager';

export default function MarketClient({ cars, prices = [], suggestions = {}, marketUpdatedAt, meta = {} }) {
  const [tab, setTab] = useState('compare');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(null); // { initial } | null
  const [bulk, setBulk] = useState(false);

  const list = useMemo(
    () =>
      cars
        .filter((c) => !q || `${c.brand} ${c.model} ${c.color}`.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => filter === 'all' || (filter === 'over' ? c.mk?.flag === 'over' : filter === 'under' ? c.mk?.flag === 'under' : filter === 'nodata' ? !c.mk?.available : c.mk?.available)),
    [cars, q, filter]
  );
  const noData = cars.filter((c) => !c.mk?.available).length;
  const openAdd = (initial) => setForm({ initial: initial || null });
  const addForCar = (c) => openAdd({ brand: c.brand, model: c.model, year: c.year, trim: c.trim || '', date: new Date().toISOString() });

  const statCard = (key, label, value, cls = '') => (
    <button onClick={() => { setTab('compare'); setFilter(key); }} className={`card p-4 text-right transition hover:-translate-y-0.5 ${tab === 'compare' && filter === key ? 'ring-2 ring-plate/40' : ''}`}>
      <div className="text-sm text-ink-mute">{label}</div>
      <div className={`num mt-2 text-2xl font-black ${cls}`}>{toFa(value)}</div>
    </button>
  );

  return (
    <>
      <PageHeader title="قیمت بازار" subtitle={`مقایسهٔ موجودی با قیمت‌های بازار · آخرین بروزرسانی ${marketUpdatedAt ? formatDate(marketUpdatedAt) : 'نامشخص'}`}>
        <button onClick={() => openAdd()} className="btn-primary"><Icon name="plus" size={18} /> ثبت قیمت دستی</button>
        <Link href="/cars" className="btn-ghost hidden sm:inline-flex">مشاهده موجودی</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCard('all', 'کل خودروهای فعال', cars.length)}
        {statCard('over', 'بالاتر از بازار', cars.filter((c) => c.mk?.flag === 'over').length, 'text-alarm')}
        {statCard('under', 'پایین‌تر از بازار', cars.filter((c) => c.mk?.flag === 'under').length, 'text-cash')}
        <button onClick={() => setTab('prices')} className={`card p-4 text-right transition hover:-translate-y-0.5 ${tab === 'prices' ? 'ring-2 ring-plate/40' : ''}`}>
          <div className="text-sm text-ink-mute">قیمت‌های دستی من</div>
          <div className="num mt-2 text-2xl font-black text-plate">{toFa(prices.length)}</div>
          <div className="mt-1 text-xs text-ink-mute">{meta.useSample ? `+ ${toFa(meta.fileCount || 0)} نمونه از فایل پروژه` : 'فقط دادهٔ دستی'}</div>
        </button>
      </div>

      <div className="mt-5 flex">
        <div className="inline-flex w-full rounded-xl border border-line bg-white p-1 sm:w-auto">
          {[
            ['compare', 'مقایسهٔ خودروها'],
            ['prices', `قیمت‌های ثبت‌شده (${toFa(prices.length)})`],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition sm:flex-none ${tab === k ? 'bg-asphalt-900 text-white shadow' : 'text-ink-soft hover:text-ink'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'compare' ? (
        <>
          <div className="card mt-4 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute" />
                <input className="input pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مدل، برند یا رنگ…" />
              </div>
              {noData > 0 && (
                <button onClick={() => setFilter(filter === 'nodata' ? 'all' : 'nodata')} className={`btn-ghost ${filter === 'nodata' ? 'border-road bg-road-soft' : ''}`}>
                  <Icon name="alert" size={18} /> بدون داده ({toFa(noData)})
                </button>
              )}
            </div>
          </div>
          <Section className="mt-5" title="مقایسهٔ خودروها">
            <div className="divide-y divide-line">
              {list.map((c) => (
                <div key={c._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CarTitle car={c} />
                      {c.mk?.available ? (
                        <Badge cls={c.mk.flag === 'over' ? 'bg-alarm-soft text-alarm' : c.mk.flag === 'under' ? 'bg-cash-soft text-cash' : 'bg-paper text-ink-soft'}>
                          {c.mk.flag === 'over' ? `+${toFa(Math.round(c.mk.diffPct))}٪ بالاتر` : c.mk.flag === 'under' ? `${toFa(Math.round(c.mk.diffPct))}٪ پایین‌تر` : 'در محدوده'}
                        </Badge>
                      ) : (
                        <Badge cls="bg-road-soft text-asphalt-900">بدون داده بازار</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm leading-7 text-ink-mute">
                      آگهی فعلی: <b className="num text-ink-soft">{priceShort(c.askingPrice)}</b> · میانه آگهی: <b className="num text-ink-soft">{c.mk?.adMedian ? priceShort(c.mk.adMedian) : '—'}</b> · معامله: <b className="num text-ink-soft">{c.mk?.dealMedian ? priceShort(c.mk.dealMedian) : '—'}</b>
                      {c.mk?.available && <> · <span className="num">{toFa(c.mk.count)}</span> نمونه</>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    {c.mk?.available && (
                      <div className="text-right sm:text-left">
                        <div className="text-sm text-ink-mute">بازه پیشنهادی</div>
                        <div className="num font-black text-plate">{priceShort(c.mk.suggested.min)} تا {priceShort(c.mk.suggested.max)}</div>
                      </div>
                    )}
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => addForCar(c)} className="btn-ghost px-3" title="ثبت قیمت بازار برای این مدل">
                        <Icon name="plus" size={18} /> <span className="hidden md:inline">قیمت</span>
                      </button>
                      <Link href={`/cars/${c._id}`} className="btn-ghost px-3">جزئیات</Link>
                    </div>
                  </div>
                </div>
              ))}
              {!list.length && <Empty>برای این فیلتر نتیجه‌ای نیست.</Empty>}
            </div>
          </Section>
        </>
      ) : (
        <div className="mt-4">
          <MarketPricesPanel prices={prices} onAdd={openAdd} onEdit={(p) => setForm({ initial: p })} onBulk={() => setBulk(true)} />
        </div>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.initial?._id ? 'ویرایش قیمت' : 'ثبت قیمت بازار'} wide>
        {form && <PriceForm key={form.initial?._id || 'new'} initial={form.initial} suggestions={suggestions} onDone={() => setForm(null)} />}
      </Modal>
      <Modal open={bulk} onClose={() => setBulk(false)} title="ورود گروهی قیمت‌ها" wide>
        {bulk && <BulkImport onDone={() => { setBulk(false); setTab('prices'); }} />}
      </Modal>
    </>
  );
}
