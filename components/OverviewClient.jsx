'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatNumber, priceShort, relativeDays, toFa } from '@/lib/persian';
import { PageHeader, Section, Money, CarTitle, CarStatusBadge, Badge, StayMeter, Empty } from './ui';
import { Modal } from './inputs';
import { CustomerForm } from './forms';
import Icon from './Icon';

function Stat({ label, value, sub, tone = '', href }) {
  const box = (
    <div className={`card flex h-full flex-col justify-between p-4 transition ${href ? 'hover:-translate-y-0.5 hover:shadow-xl' : ''}`}>
      <div className="text-sm font-bold text-ink-mute">{label}</div>
      <div className={`num mt-3 text-[27px] font-black tracking-tight ${tone}`}>{value}</div>
      {sub && <div className="mt-1 text-sm text-ink-mute">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{box}</Link> : box;
}

export default function OverviewClient({ data }) {
  const [modal, setModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const s = data.stats;
  const send = async (type = 'digest') => {
    setSending(true); setSent('');
    try {
      const r = await api(`/api/notify?type=${type}&secret=${encodeURIComponent(process.env.NEXT_PUBLIC_NOTIFY_SECRET || '')}`);
      setSent(r.ok ? 'گزارش ارسال شد' : r.error);
    } catch (e) { setSent(e.message); }
    setSending(false);
  };
  return (
    <>
      <PageHeader title="داشبورد امروز" subtitle={`${formatDate(data.now)} · خلاصهٔ چیزی که همین الان مهم است`}>
        <button className="btn-ghost" onClick={() => send()} disabled={sending}><Icon name="send" size={17} /> {sending ? 'در حال ارسال…' : 'ارسال گزارش تلگرام'}</button>
        <Link href="/cars/new" className="btn-primary"><Icon name="plus" size={17} /> ثبت خودرو</Link>
      </PageHeader>
      {sent && <div className="mb-4 rounded-xl bg-cash-soft px-4 py-3 text-sm font-bold text-cash">{sent}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="خودروی فعال" value={toFa(s.activeCount)} sub={`${toFa(s.ownedCount)} ملکی · ${toFa(s.consignCount)} امانی`} href="/cars" />
        <Stat label="ارزش روز موجودی ملکی" value={priceShort(s.marketValue)} sub="تومان" tone="text-plate" href="/market" />
        <Stat label="سود واقعی این ماه" value={priceShort(s.monthReal)} sub={`${toFa(s.soldThisMonth)} فروش · اسمی ${priceShort(s.monthNominal)}`} tone={s.monthReal < 0 ? 'text-alarm' : 'text-cash'} href="/reports" />
        <Stat label="مطالبات وصول‌نشده" value={priceShort(s.receivableTotal)} sub="تومان" tone={s.receivableTotal ? 'text-alarm' : 'text-cash'} href="/cashflow" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Section title="هشدارهای امروز" action={<span className="chip bg-alarm-soft text-alarm">{toFa(data.dormant.length + data.cheques.length + data.overpriced.length)} مورد</span>} tone="alarm">
          <div className="space-y-3">
            {data.cheques.slice(0, 4).map((q) => (
              <Link key={q._id} href="/cheques" className={`flex items-center gap-3 rounded-xl p-3 transition hover:bg-paper ${q.level === 'overdue' ? 'bg-alarm-soft' : 'bg-amberx-soft'}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-alarm"><Icon name="cheque" size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">چک {q.direction === 'received' ? 'دریافتی' : 'پرداختی'} {q.party || 'بدون نام'}</span><span className="block text-sm text-ink-mute">{relativeDays(q.dueDate)} · {q.bank || 'بانک نامشخص'}</span></span>
                <span className="num shrink-0 font-extrabold">{priceShort(q.amount)}</span>
              </Link>
            ))}
            {data.dormant.slice(0, 4).map((c) => (
              <Link key={c._id} href={`/cars/${c._id}`} className="flex items-center gap-3 rounded-xl bg-alarm-soft p-3 transition hover:bg-alarm/15">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-alarm"><Icon name="clock" size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold"><CarTitle car={c} href={false} /></span><span className="block text-sm text-ink-mute">{toFa(c.fin.days)} روز در پارکینگ · هزینه خواب {priceShort(c.fin.capitalCost)}</span></span>
                <span className="font-bold text-alarm">اقدام</span>
              </Link>
            ))}
            {data.overpriced.slice(0, 3).map((c) => (
              <Link key={c._id} href={`/cars/${c._id}`} className="flex items-center gap-3 rounded-xl bg-plate-soft p-3 transition hover:bg-plate/10">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-plate"><Icon name="market" size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold"><CarTitle car={c} href={false} /></span><span className="block text-sm text-ink-mute">قیمت آگهی {priceShort(c.askingPrice)} · {toFa(Math.round(c.mk.diffPct))}٪ بالاتر از میانه</span></span>
                <span className="font-bold text-plate">بازبینی</span>
              </Link>
            ))}
            {!data.cheques.length && !data.dormant.length && !data.overpriced.length && <Empty>فعلاً هشدار مهمی نیست. همین خوبه.</Empty>}
          </div>
        </Section>

        <Section title="پیگیری مشتری" action={<Link href="/customers" className="text-sm font-bold text-plate">همه مشتری‌ها ←</Link>}>
          <div className="space-y-2">
            {data.followToday.slice(0, 5).map((c) => (
              <Link key={c._id} href="/customers" className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-paper">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-road text-asphalt-950"><Icon name="phone" size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{c.name}</span><span className="block truncate text-sm text-ink-mute">{c.wanted || 'خودرو مشخص نشده'} · {c.phone || 'بدون تلفن'}</span></span>
                <Badge cls="bg-road-soft text-asphalt-900">امروز</Badge>
              </Link>
            ))}
            {data.cooling.slice(0, 4).map((c) => (
              <Link key={c._id} href="/customers" className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-paper">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink-soft"><Icon name="phone" size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{c.name}</span><span className="block truncate text-sm text-ink-mute">{toFa(c.silentDays)} روز بدون تماس · {c.phone || 'بدون تلفن'}</span></span>
                <Badge cls="bg-alarm-soft text-alarm">سرد می‌شود</Badge>
              </Link>
            ))}
            {!data.followToday.length && !data.cooling.length && <Empty>لیست پیگیری خالی است.</Empty>}
          </div>
          <button className="btn-ghost mt-4 w-full" onClick={() => setModal(true)}><Icon name="plus" size={18} /> ثبت لید جدید</button>
        </Section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="موجودی با بیشترین ماندگاری" action={<Link href="/cars?sort=stale" className="text-sm font-bold text-plate">مشاهده موجودی ←</Link>}>
          <div className="space-y-4">
            {data.active.slice().sort((a, b) => b.fin.days - a.fin.days).slice(0, 5).map((c) => (
              <Link key={c._id} href={`/cars/${c._id}`} className="block rounded-xl p-2 transition hover:bg-paper">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-3"><CarTitle car={c} href={false} /><span className="num text-sm font-bold">{priceShort(c.askingPrice)}</span></div>
                <StayMeter days={c.fin.days} threshold={data.settings.dormantDays} />
              </Link>
            ))}
            {!data.active.length && <Empty>موجودی فعال نداری.</Empty>}
          </div>
        </Section>
        <Section title="وضعیت انتقال سند" action={<span className="chip bg-road-soft text-asphalt-900">{toFa(data.transferPending.length)} پرونده</span>}>
          <div className="space-y-2">
            {data.transferPending.map((c) => (
              <Link key={c._id} href={`/cars/${c._id}`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-paper">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-road text-asphalt-950"><Icon name="car" size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold"><CarTitle car={c} href={false} /></span><span className="block truncate text-sm text-ink-mute">{c.missing.length ? `مدارک ناقص: ${c.missing.slice(0, 2).join('، ')}` : 'مدارک کامل'}</span></span>
                <CarStatusBadge status={c.status} />
              </Link>
            ))}
            {!data.transferPending.length && <Empty>پرونده‌ای منتظر انتقال سند نیست.</Empty>}
          </div>
        </Section>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="ثبت لید جدید"><CustomerForm onDone={() => setModal(false)} cars={data.active} /></Modal>
    </>
  );
}
