'use client';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { formatDate, formatNumber, priceShort, toFa } from '@/lib/persian';
import { TX_CATEGORIES, TX_METHODS } from '@/lib/constants';
import { PageHeader, Section, Empty } from './ui';
import { Modal } from './inputs';
import { TxForm } from './forms';
import Icon from './Icon';
import CashflowPrint from './CashflowPrint';

export default function CashflowClient({ transactions = [], cars = [], cheques = [], stats = {} }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [printRow, setPrintRow] = useState(null);
  const [tab, setTab] = useState('all');
  const rows = transactions.filter((t) => tab === 'all' || t.direction === tab);
  const incoming = transactions.filter((t) => t.direction === 'in').reduce((a, t) => a + Number(t.amount || 0), 0);
  const outgoing = transactions.filter((t) => t.direction === 'out').reduce((a, t) => a + Number(t.amount || 0), 0);
  const print = (row = null) => {
    // Render the selected receipt before the browser takes its print snapshot.
    flushSync(() => setPrintRow(row));
    window.print();
  };
  const edit = (row = null) => {
    setEditing(row);
    setModal(true);
  };
  return <>
    <div className="cashflow-screen">
      <PageHeader title="نقدینگی و تسویه" subtitle="ورودی، خروجی و آنچه هنوز باید وصول شود">
        <button type="button" className="btn-ghost" onClick={() => print()}>چاپ گزارش / PDF</button>
        <button type="button" className="btn-primary" onClick={() => edit()}><Icon name="plus" /> ثبت تراکنش</button>
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['ورودی ثبت‌شده', incoming, 'text-cash'],
          ['خروجی ثبت‌شده', outgoing, 'text-alarm'],
          ['خالص نقد ثبت‌شده', incoming - outgoing, incoming - outgoing < 0 ? 'text-alarm' : 'text-cash'],
          ['مطالبات باز', stats.receivableTotal || 0, 'text-amberx'],
        ].map(([label, amount, color]) => <div key={label} className="card min-w-0 p-4">
          <div className="text-sm text-ink-mute">{label}</div>
          <div className={`num mt-2 break-words text-xl font-black sm:text-2xl ${color}`} title={`${formatNumber(amount)} تومان`}>{priceShort(amount)}</div>
          <div className="text-sm text-ink-mute">تومان</div>
        </div>)}
      </div>
      <Section className="mt-5" title="تراکنش‌ها" action={
        <div className="flex flex-wrap gap-1 rounded-lg bg-paper p-1" role="group" aria-label="فیلتر تراکنش‌ها">
          {[['all', 'همه'], ['in', 'ورودی'], ['out', 'خروجی']].map(([k, l]) =>
            <button type="button" key={k} aria-pressed={tab === k} onClick={() => setTab(k)} className={`min-h-[44px] rounded-md px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-white shadow' : 'text-ink-mute'}`}>{l}</button>
          )}
        </div>
      }>
        <p className="mb-2 text-sm text-ink-mute">چاپ گزارش شامل {toFa(rows.length)} تراکنشِ فیلتر فعلی است؛ خلاصهٔ بالای صفحه مربوط به همهٔ تراکنش‌هاست.</p>
        <div className="divide-y divide-line">{rows.map((t) =>
          <div key={t._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${t.direction === 'in' ? 'bg-cash-soft text-cash' : 'bg-alarm-soft text-alarm'}`} aria-hidden="true">{t.direction === 'in' ? '+' : '−'}</span>
              <div className="min-w-0">
                <div className="break-words font-bold">{TX_CATEGORIES[t.category] || t.category} · {t.party || 'بدون طرف حساب'}</div>
                <div className="mt-1 break-words text-sm text-ink-mute">{formatDate(t.date)}{t.car ? ` · ${t.car.brand} ${t.car.model}` : ''} · {TX_METHODS[t.method] || t.method}</div>
                {t.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-soft">{t.note}</p>}
                {t.contract && <p className="mt-1 text-sm text-plate">متصل به قولنامه</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <div className={`num break-words font-extrabold ${t.direction === 'in' ? 'text-cash' : 'text-alarm'}`} title={`${formatNumber(t.amount)} تومان`}>
                {t.direction === 'in' ? 'دریافت' : 'پرداخت'} {priceShort(t.amount)} <span className="text-sm font-medium">تومان</span>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost px-3" onClick={() => print(t)} aria-label={`چاپ رسید ${t.party || 'تراکنش'}`}>چاپ رسید</button>
                <button type="button" className="btn-blue px-3" onClick={() => edit(t)} aria-label={`ویرایش تراکنش ${t.party || ''}`}><Icon name="edit" size={17} /> ویرایش</button>
              </div>
            </div>
          </div>
        )}{!rows.length && <Empty>{transactions.length ? 'تراکنشی در این فیلتر نیست.' : 'تراکنشی ثبت نشده.'}</Empty>}</div>
      </Section>
      <Section className="mt-5" title="چک‌های باز">
        <div className="grid gap-2 sm:grid-cols-2">{cheques.map((q) =>
          <div key={q._id} className="min-w-0 rounded-xl bg-paper p-3">
            <div className="flex flex-wrap justify-between gap-2 font-bold"><span className="break-words">{q.party || 'بدون طرف حساب'}</span><span className="num">{priceShort(q.amount)} تومان</span></div>
            <div className="text-sm text-ink-mute">{q.direction === 'received' ? 'دریافتی' : 'پرداختی'} · {formatDate(q.dueDate)}</div>
          </div>
        )}{!cheques.length && <Empty>چک بازی نیست.</Empty>}</div>
      </Section>
    </div>
    <CashflowPrint rows={printRow ? [printRow] : rows} receipt={Boolean(printRow)} tab={tab} cheques={printRow ? [] : cheques} />
    <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'ویرایش تراکنش' : 'ثبت تراکنش'} wide>
      <TxForm key={editing?._id || 'new'} initial={editing} cars={cars} onDone={() => setModal(false)} />
    </Modal>
  </>;
}
