'use client';
import { useMemo, useState } from 'react';
import { formatDate, priceShort, toFa } from '@/lib/persian';
import { PageHeader, Section, Empty } from './ui';
import { Modal } from './inputs';
import { TxForm } from './forms';
import Icon from './Icon';

export default function CashflowClient({ transactions, cars, cheques, stats }) {
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState('all');
  const rows = transactions.filter((t) => tab === 'all' || t.direction === tab);
  const incoming = transactions.filter((t) => t.direction === 'in').reduce((a, t) => a + t.amount, 0);
  const outgoing = transactions.filter((t) => t.direction === 'out').reduce((a, t) => a + t.amount, 0);
  return <>
    <PageHeader title="نقدینگی و تسویه" subtitle="ورودی، خروجی و آنچه هنوز باید وصول شود"><button className="btn-primary" onClick={() => setModal(true)}><Icon name="plus" /> ثبت تراکنش</button></PageHeader>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="card p-4"><div className="text-sm text-ink-mute">ورودی ثبت‌شده</div><div className="num mt-2 text-2xl font-black text-cash">{priceShort(incoming)}</div><div className="text-sm text-ink-mute">تومان</div></div><div className="card p-4"><div className="text-sm text-ink-mute">خروجی ثبت‌شده</div><div className="num mt-2 text-2xl font-black text-alarm">{priceShort(outgoing)}</div><div className="text-sm text-ink-mute">تومان</div></div><div className="card p-4"><div className="text-sm text-ink-mute">خالص نقد ثبت‌شده</div><div className={`num mt-2 text-2xl font-black ${incoming - outgoing < 0 ? 'text-alarm' : 'text-cash'}`}>{priceShort(incoming - outgoing)}</div><div className="text-sm text-ink-mute">تومان</div></div><div className="card p-4"><div className="text-sm text-ink-mute">مطالبات باز</div><div className="num mt-2 text-2xl font-black text-amberx">{priceShort(stats.receivableTotal)}</div><div className="text-sm text-ink-mute">تومان</div></div></div>
    <Section className="mt-5" title="تراکنش‌ها" action={<div className="flex gap-1 rounded-lg bg-paper p-1">{[['all', 'همه'], ['in', 'ورودی'], ['out', 'خروجی']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-white shadow' : 'text-ink-mute'}`}>{l}</button>)}</div>}>
      <div className="divide-y divide-line">{rows.map((t) => <div key={t._id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${t.direction === 'in' ? 'bg-cash-soft text-cash' : 'bg-alarm-soft text-alarm'}`}>{t.direction === 'in' ? '+' : '−'}</span><div className="min-w-0"><div className="truncate font-bold">{t.category} · {t.party || 'بدون طرف حساب'}</div><div className="truncate text-sm text-ink-mute">{formatDate(t.date)}{t.car ? ` · ${t.car.brand} ${t.car.model}` : ''} · {t.method}</div></div></div><div className={`num font-extrabold ${t.direction === 'in' ? 'text-cash' : 'text-alarm'}`}>{t.direction === 'in' ? '+' : '−'}{priceShort(t.amount)}</div></div>)}{!rows.length && <Empty>تراکنشی ثبت نشده.</Empty>}</div>
    </Section>
    <Section className="mt-5" title="چک‌های باز"><div className="grid gap-2 sm:grid-cols-2">{cheques.map((q) => <div key={q._id} className="rounded-xl bg-paper p-3"><div className="flex justify-between gap-2 font-bold"><span>{q.party}</span><span className="num">{priceShort(q.amount)}</span></div><div className="text-sm text-ink-mute">{q.direction === 'received' ? 'دریافتی' : 'پرداختی'} · {formatDate(q.dueDate)}</div></div>)}{!cheques.length && <Empty>چک بازی نیست.</Empty>}</div></Section>
    <Modal open={modal} onClose={() => setModal(false)} title="ثبت تراکنش" wide><TxForm cars={cars} onDone={() => setModal(false)} /></Modal>
  </>;
}
