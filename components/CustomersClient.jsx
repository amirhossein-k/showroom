'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LEAD_SOURCES, LEAD_STATUS } from '@/lib/constants';
import { formatDate, priceShort, relativeDays, toFa } from '@/lib/persian';
import { PageHeader, Section, Badge, LeadStatusBadge, Empty } from './ui';
import { Modal } from './inputs';
import { CustomerForm } from './forms';
import Icon from './Icon';

export default function CustomersClient({ customers, cars }) {
  const [tab, setTab] = useState('today');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = customers.filter((c) => !query || `${c.name} ${c.phone} ${c.wanted}`.toLowerCase().includes(query));
    if (tab === 'today') list = list.filter((c) => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date());
    if (tab === 'cooling') list = list.filter((c) => !c.nextFollowUp || new Date(c.nextFollowUp) < new Date());
    if (tab === 'hot') list = list.filter((c) => ['hot', 'warm'].includes(c.status));
    return list.sort((a, b) => new Date(a.nextFollowUp || '9999') - new Date(b.nextFollowUp || '9999'));
  }, [customers, q, tab]);
  const count = (key) => key === 'today' ? customers.filter((c) => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date()).length : key === 'cooling' ? customers.filter((c) => !c.nextFollowUp || new Date(c.nextFollowUp) < new Date()).length : key === 'hot' ? customers.filter((c) => ['hot', 'warm'].includes(c.status)).length : customers.length;

  return (
    <>
      <PageHeader title="مشتری و پیگیری" subtitle={`${toFa(customers.length)} لید ثبت‌شده · هیچ مشتری نباید بی‌خبر بماند`}>
        <button className="btn-primary" onClick={() => { setSelected(null); setModal('form'); }}><Icon name="plus" /> ثبت لید</button>
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['today', 'پیگیری امروز'], ['cooling', 'در حال سرد شدن'], ['hot', 'داغ و گرم'], ['all', 'کل لیدها']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`card p-4 text-right transition ${tab === k ? 'border-plate ring-2 ring-plate/10' : ''}`}><div className="text-sm font-bold text-ink-mute">{l}</div><div className="num mt-2 text-2xl font-black">{toFa(count(k))}</div></button>
        ))}
      </div>
      <div className="card mt-5 p-3">
        <div className="relative"><Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute" /><input className="input pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، تلفن یا خودروی مدنظر…" /></div>
      </div>
      <div className="mt-5 grid gap-3">
        {filtered.map((c) => (
          <div key={c._id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${c.status === 'hot' ? 'bg-alarm-soft text-alarm' : c.status === 'warm' ? 'bg-amberx-soft text-amberx' : 'bg-plate-soft text-plate'}`}><Icon name="users" size={20} /></span>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold">{c.name}</span><LeadStatusBadge status={c.status} /><Badge cls="bg-paper text-ink-soft">{LEAD_SOURCES[c.source] || c.source}</Badge></div><div className="mt-1 truncate text-sm text-ink-mute">{c.phone || 'بدون تلفن'} · {c.wanted || 'خودرو مشخص نشده'}{c.nextFollowUp ? ` · پیگیری ${relativeDays(c.nextFollowUp)}` : ''}</div></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0"><div className="hidden text-left text-sm text-ink-mute sm:block">آخرین تماس<br /><b className="text-ink-soft">{formatDate(c.lastContact)}</b></div>{c.phone && <a className="btn-ghost px-3" href={`tel:${c.phone}`}><Icon name="phone" size={18} /> تماس</a>}<button className="btn-blue" onClick={() => { setSelected(c); setModal('form'); }}>ویرایش</button></div>
          </div>
        ))}
        {!filtered.length && <Empty>در این بخش مشتری‌ای نیست.</Empty>}
      </div>
      <Modal open={modal === 'form'} onClose={() => setModal(null)} title={selected ? 'ویرایش مشتری' : 'ثبت لید جدید'} wide><CustomerForm initial={selected} cars={cars} onDone={() => setModal(null)} /></Modal>
    </>
  );
}
