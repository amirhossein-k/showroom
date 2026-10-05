'use client';
import { useState } from 'react';
import Link from 'next/link';
import { formatDate, formatNumber, toFa } from '@/lib/persian';
import { filterRows } from '@/lib/receivables';
import { TxForm } from './forms';
import { Section, Empty } from './ui';

export default function ReceivablesPanel({ receivables = [], cars = [] }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('all');
  const [selected, setSelected] = useState('');
  const [saved, setSaved] = useState(false);
  const rows = filterRows(receivables, query, mode);
  const total = rows.reduce((s,c) => s + c.remaining, 0);
  const money = n => `${formatNumber(n)} تومان`;
  const title = c => `${c.brand} ${c.model} ${c.year || ''}`.trim();
  return <Section className="mt-5" title="ریز مطالبات خودروهای فروخته‌شده">
    <style>{`
      .rp {color:oklch(29% .012 250)}
      .rp .rp-note {max-width:72ch;line-height:1.8}
      .rp .rp-tools {display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:20px 0 12px}
      .rp .rp-search {flex:1 1 240px;min-width:0}
      .rp label {display:block;font-size:.875rem;margin-bottom:8px;font-weight:700}
      .rp input {width:100%;min-height:44px;padding:10px 12px;border:1px solid oklch(86% .008 250);border-radius:8px;background:oklch(99% .005 250);font-size:1rem}
      .rp :is(button,a) {min-height:44px}
      .rp :is(button,input,a):focus-visible {outline:2px solid oklch(46% .13 250);outline-offset:3px}
      .rp .rp-filter {display:flex;flex-wrap:wrap;gap:4px}
      .rp .rp-filter button {border:1px solid oklch(86% .008 250);padding:8px 12px;border-radius:8px;font-size:.875rem;background:oklch(98% .005 250)}
      .rp .rp-filter button[aria-pressed="true"] {color:oklch(32% .08 250);background:oklch(93% .025 250);border-color:oklch(65% .08 250);font-weight:800}
      .rp .rp-filter button:hover {background:oklch(94% .012 250)}
      .rp .rp-summary {font-size:.875rem;padding-bottom:12px}
      .rp ul {margin:0;padding:0;list-style:none}
      .rp .rp-row {border-top:1px solid oklch(90% .008 250);padding:20px 0;display:grid;gap:16px}
      .rp .rp-title {font-size:1.125rem;font-weight:800;text-decoration:underline;text-underline-offset:4px}
      .rp .rp-meta {font-size:.875rem;color:oklch(46% .012 250);margin-top:8px;overflow-wrap:anywhere}
      .rp .rp-buyer {font-weight:700;overflow-wrap:anywhere}
      .rp .rp-money {display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin:0;font-variant-numeric:tabular-nums}
      .rp dt {font-size:.875rem;color:oklch(46% .012 250);margin-bottom:4px}
      .rp dd {margin:0;font-weight:700;overflow-wrap:anywhere}
      .rp .rp-remaining dd {color:oklch(40% .09 55);font-weight:900}
      .rp .rp-status {display:inline-block;padding:4px 8px;border-radius:6px;font-size:.875rem;color:oklch(36% .065 55);background:oklch(95% .025 55)}
      .rp .rp-actions {display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
      .rp .rp-link {display:inline-flex;align-items:center;font-size:.875rem;font-weight:700;text-decoration:underline;text-underline-offset:4px;overflow-wrap:anywhere}
      .rp .rp-form {padding:20px 0 24px;border-top:1px dashed oklch(80% .01 250)}
      .rp h3 {font-size:1.125rem;font-weight:800;margin:0 0 8px}
      @media(min-width:640px) {.rp .rp-money {grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(min-width:1100px) {.rp .rp-row {grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr) minmax(0,2fr) minmax(0,1.2fr);gap:20px;align-items:start}}
    `}</style>
    <div className="rp" dir="rtl">
      <p className="rp-note text-sm">
        مانده بر اساس قیمت فروش و دریافت‌های ثبت‌شده با بابت «فروش» و اتصال به همین خودرو محاسبه می‌شود.
        نبود دریافت ثبت‌شده، اثبات پرداخت‌نکردن خریدار نیست؛ اگر پول رسیده، ابتدا سوابق و رسید بانکی را بررسی کن.
      </p>
      <div className="rp-tools">
        <div className="rp-search">
          <label htmlFor="receivables-search">جست‌وجوی خودرو، پلاک، خریدار یا شماره قولنامه</label>
          <input id="receivables-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="نام خودرو، خریدار یا بخشی از پلاک" />
        </div>
        <div className="rp-filter" role="group" aria-label="فیلتر دریافت ثبت‌شده">
          {[['all','همه مطالبات'],['none','بدون دریافت ثبت‌شده'],['partial','دریافت ناقص ثبت‌شده']].map(([key,label]) =>
            <button type="button" key={key} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}
        </div>
      </div>
      <p className="rp-summary" role="status">{toFa(rows.length)} خودرو · جمع مانده این فیلتر: <strong>{money(total)}</strong></p>
      {saved && <p role="status" className="text-sm text-cash mb-3">دریافت ثبت شد؛ گزارش در حال به‌روزرسانی است.</p>}
      {!rows.length ? <Empty>{receivables.length ? 'خودرویی با این جست‌وجو یا فیلتر پیدا نشد.'
        : 'برای خودروهای فروخته‌شده مانده مثبتی در محاسبه فعلی ثبت نشده است.'}</Empty>
        : <ul>{rows.map(c => <li key={c._id}>
          <div className="rp-row">
            <div>
              <Link className="rp-title" href={`/cars/${c._id}`}>{toFa(title(c))}</Link>
              <div className="rp-meta">{c.color && <span>{c.color} · </span>}پلاک: {
                c.plate && Object.values(c.plate).some(Boolean)
                  ? <bdi>{toFa([c.plate.p1,c.plate.letter,c.plate.p2,c.plate.region && `ایران ${c.plate.region}`].filter(Boolean).join(' '))}</bdi>
                  : 'ثبت نشده'}</div>
              <div className="rp-meta">تاریخ فروش: {c.saleDate ? formatDate(c.saleDate) : 'ثبت نشده'}</div>
            </div>
            <div><div className="rp-meta">خریدار</div><div className="rp-buyer">{c.buyerName || 'نام خریدار ثبت نشده'}</div></div>
            <dl className="rp-money">
              <div><dt>مبلغ فروش</dt><dd>{money(c.salePrice)}</dd></div>
              <div><dt>دریافتی ثبت‌شده</dt><dd>{money(c.received)}</dd></div>
              <div className="rp-remaining"><dt>مانده ثبت‌شده</dt><dd>{money(c.remaining)}</dd></div>
            </dl>
            <div>
              <span className="rp-status">{c.received > 0 ? 'بخشی از دریافت ثبت شده' : 'دریافتی ثبت نشده'}</span>
              {c.pendingChequeCount > 0 && <p className="rp-meta">
                {toFa(c.pendingChequeCount)} چک دریافتی در انتظار: {money(c.pendingChequeAmount)}
                {c.nextChequeDue && <> · نزدیک‌ترین سررسید: {formatDate(c.nextChequeDue)}</>}
                <br />این چک‌ها وصول‌شده محسوب نشده‌اند.
              </p>}
              <div className="rp-actions">
                {c.contracts?.length ? c.contracts.map(k =>
                  <Link key={k.id} className="rp-link" href={`/contracts/${k.id}`}>مدیریت پرداخت قولنامه {toFa(k.number || '')}</Link>)
                  : <button type="button" className="btn-blue" aria-expanded={selected === c._id}
                      aria-controls={`receive-form-${c._id}`}
                      onClick={() => {setSelected(selected === c._id ? '' : c._id);setSaved(false);}}>
                      {selected === c._id ? 'بستن فرم دریافت' : 'ثبت مبلغ دریافت‌شده'}
                    </button>}
                <Link className="rp-link" href={`/cars/${c._id}`}>پرونده خودرو</Link>
              </div>
              {c.contracts?.length > 1 && <p className="rp-meta">چند قولنامه امضاشده به این خودرو وصل است؛ قولنامه درست را پیش از ثبت دریافت بررسی کن.</p>}
            </div>
          </div>
          {selected === c._id && !c.contracts?.length && <div className="rp-form" id={`receive-form-${c._id}`}>
            <h3>ثبت دریافت برای {toFa(title(c))}</h3>
            <p className="rp-note text-sm mb-4">فقط مبلغ واقعاً دریافت‌شده را وارد کن، نه کل قیمت فروش.
              مانده ثبت‌شده: {money(c.remaining)}. خودرو ثابت است؛ بابت باید «فروش» و نوع باید «ورودی» بماند تا مانده کم شود.</p>
            <TxForm key={c._id} fixedCar={c._id} cars={cars}
              defaults={{direction:'in',category:'sale',method:'transfer',amount:0,
                party:c.buyerName || '',note:`دریافت بابت فروش ${title(c)}`}}
              onDone={() => {setSelected('');setSaved(true);}} />
          </div>}
        </li>)}</ul>}
    </div>
  </Section>;
}
