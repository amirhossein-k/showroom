'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, priceShort, relativeDays, toFa } from '@/lib/persian';
import { PageHeader, Section, Badge, ChequeStatusBadge, Empty } from './ui';
import { Modal } from './inputs';
import { ChequeForm } from './forms';
import Icon from './Icon';

export default function ChequesClient({ cheques, cars }) {
  const [tab, setTab] = useState('pending');
  const [modal, setModal] = useState(false);
  const list = tab === 'all' ? cheques : cheques.filter((q) => q.status === tab);
  const pending = cheques.filter((q) => q.status === 'pending');
  const near = pending.filter((q) => (q.daysLeft ?? 99) <= 7);
  const total = pending.reduce((a, q) => a + q.amount, 0);
  return (
    <>
      <PageHeader title="چک‌ها و سررسیدها" subtitle="قبل از برگشت خوردن، خبرش را داشته باش">
        <button className="btn-primary" onClick={() => setModal(true)}><Icon name="plus" /> ثبت چک</button>
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="card p-4"><div className="text-sm text-ink-mute">در جریان</div><div className="num mt-2 text-2xl font-black">{toFa(pending.length)}</div><div className="text-sm text-ink-mute">{priceShort(total)} تومان</div></div><div className="card p-4"><div className="text-sm text-ink-mute">۷ روز آینده</div><div className="num mt-2 text-2xl font-black text-amberx">{toFa(near.length)}</div><div className="text-sm text-ink-mute">{priceShort(near.reduce((a, q) => a + q.amount, 0))}</div></div><div className="card p-4"><div className="text-sm text-ink-mute">دریافتی</div><div className="num mt-2 text-2xl font-black text-cash">{priceShort(pending.filter((q) => q.direction === 'received').reduce((a, q) => a + q.amount, 0))}</div></div><div className="card p-4"><div className="text-sm text-ink-mute">پرداختی</div><div className="num mt-2 text-2xl font-black text-alarm">{priceShort(pending.filter((q) => q.direction === 'issued').reduce((a, q) => a + q.amount, 0))}</div></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{[['pending', 'در جریان'], ['all', 'همه'], ['cleared', 'وصول‌شده'], ['bounced', 'برگشتی']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-asphalt-900 text-white' : 'btn-ghost'}`}>{l}</button>)}</div>
      <Section className="mt-4" title="دفتر چک">
        <div className="divide-y divide-line">{list.map((q) => <ChequeRow key={q._id} cheque={q} />)}{!list.length && <Empty>چکی در این بخش نیست.</Empty>}</div>
      </Section>
      <Modal open={modal} onClose={() => setModal(false)} title="ثبت چک" wide><ChequeForm cars={cars} onDone={() => setModal(false)} /></Modal>
    </>
  );
}
function ChequeRow({ cheque: q }) {
  const [busy, setBusy] = useState(false);
  const update = async (status) => { setBusy(true); await api(`/api/cheques/${q._id}`, 'PATCH', { status }); window.location.reload(); };
  const due = q.daysLeft ?? Math.floor((new Date(q.dueDate) - new Date()) / 86400000);
  return <div className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${due < 0 && q.status === 'pending' ? 'rounded-xl bg-alarm-soft px-3' : ''}`}><div className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${q.direction === 'received' ? 'bg-cash-soft text-cash' : 'bg-alarm-soft text-alarm'}`}><Icon name="cheque" size={19} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 font-extrabold">{q.party || 'طرف حساب نامشخص'}<ChequeStatusBadge status={q.status} /><Badge cls={q.direction === 'received' ? 'bg-cash-soft text-cash' : 'bg-alarm-soft text-alarm'}>{q.direction === 'received' ? 'دریافتی' : 'پرداختی'}</Badge></div><div className="mt-1 truncate text-sm text-ink-mute">{q.bank || 'بانک نامشخص'} · شماره {toFa(q.number || '—')} · {q.car ? `${q.car.brand} ${q.car.model}` : 'بدون خودرو'}</div></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-left"><div className="num text-lg font-black">{priceShort(q.amount)} <span className="text-sm font-semibold text-ink-mute">تومان</span></div><div className={`text-sm font-bold ${due < 0 ? 'text-alarm' : due <= 7 ? 'text-amberx' : 'text-ink-mute'}`}>{relativeDays(q.dueDate)} · {formatDate(q.dueDate)}</div></div>{q.status === 'pending' && <button disabled={busy} onClick={() => update('cleared')} className="btn-ghost px-3 text-cash" title="وصول شد"><Icon name="check" size={18} /></button>}</div></div>;
}
