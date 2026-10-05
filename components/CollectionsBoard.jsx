'use client';
// [collections] + [settlement] بخش‌های صفحه نقدینگی و داشبورد
import { useState } from 'react';
import Link from 'next/link';
import { formatDate, formatNumber, priceShort, toFa } from '@/lib/persian';
import { Section, Empty, Badge } from './ui';
import Icon from './Icon';
import { ClaimRow, TxVerifyRow, ChequeRecordRow } from './CollectionPanel';

const money = (n) => `${formatNumber(n)} تومان`;
const carName = (c = {}) => toFa([c.brand, c.model, c.year].filter(Boolean).join(' ')) || 'خودرو';
const LEVEL = {
  overdue: { box: 'bg-alarm-soft', icon: 'text-alarm', label: 'فوری' },
  near: { box: 'bg-amberx-soft', icon: 'text-amberx', label: 'نزدیک' },
  info: { box: 'bg-paper', icon: 'text-ink-mute', label: 'یادآوری' },
};
const ICON = { cheque_overdue: 'cheque', cheque_near: 'cheque', cheque_bounced: 'cheque', cheque_unrecorded: 'cheque', followup_due: 'phone', claim_pending: 'check' };

/** فهرست هشدارها؛ compact برای داشبورد */
export function CollectionAlertList({ alerts = [], limit, compact = false }) {
  const [all, setAll] = useState(false);
  const shown = limit && !all ? alerts.slice(0, limit) : alerts;
  if (!alerts.length) return <Empty>مطالبه سررسیدگذشته، چک نزدیک یا پرداخت تأییدنشده‌ای نیست.</Empty>;
  return (
    <div className="space-y-2">
      {shown.map((a) => {
        const lv = LEVEL[a.level] || LEVEL.info;
        return (
          <Link key={a.key} href={a.href} className={`flex items-center gap-3 rounded-xl p-3 transition hover:brightness-[.98] ${lv.box}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white ${lv.icon}`}><Icon name={ICON[a.kind] || 'alert'} size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-bold">{toFa(a.title)}</span>
              <span className="block break-words text-sm text-ink-mute">{toFa(a.sub)}{!compact && a.date ? ` · ${formatDate(a.date)}` : ''}</span>
            </span>
            {a.amount > 0 && <span className="num shrink-0 font-extrabold" title={money(a.amount)}>{priceShort(a.amount)}</span>}
          </Link>
        );
      })}
      {limit && alerts.length > limit && (
        <button type="button" className="btn-ghost w-full text-sm" onClick={() => setAll(!all)}>{all ? 'نمایش کمتر' : `همه ${toFa(alerts.length)} هشدار`}</button>
      )}
    </div>
  );
}

export function CollectionAlerts({ alerts = [] }) {
  const urgent = alerts.filter((a) => a.level === 'overdue').length;
  return (
    <Section className="mt-5" title="هشدار مطالبات و چک‌ها" tone={urgent ? 'alarm' : undefined}
      action={<span className={`chip ${urgent ? 'bg-alarm-soft text-alarm' : 'bg-paper text-ink-soft'}`}>{toFa(urgent)} فوری · {toFa(alerts.length)} کل</span>}>
      <CollectionAlertList alerts={alerts} limit={8} />
    </Section>
  );
}

/** کارت‌های «چه پولی واقعاً رسیده و چه چیزی فقط در انتظار است» */
export function CollectionSummary({ totals = {}, settlementTotals = {} }) {
  const cards = [
    ['وصول تأییدشده با بانک', totals.verifiedIn, 'text-cash', 'از خودروهای باز'],
    ['ثبت‌شده، تطبیق‌نشده', totals.unverifiedIn, 'text-plate', 'رسیدش هنوز دیده نشده'],
    ['اعلام خریدار، بررسی‌نشده', totals.claimed, 'text-plate', 'از مانده کم نشده'],
    ['چک دریافتی در جریان', totals.pendingCheques, 'text-amberx', 'وصول‌شده نیست'],
    ['مطالبه سررسیدگذشته', totals.overdueAmount, totals.overdueAmount ? 'text-alarm' : 'text-cash', `${toFa(totals.overdueCount || 0)} خودرو`],
    ['بدهی باز به مالک امانی/شرکا', settlementTotals.owed, settlementTotals.owed ? 'text-alarm' : 'text-cash', `قابل پرداخت با پول رسیده: ${priceShort(settlementTotals.payableNow || 0)}`],
  ];
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map(([label, amount, tone, sub]) => (
        <div key={label} className="card min-w-0 p-4">
          <div className="text-sm text-ink-mute">{label}</div>
          <div className={`num mt-2 break-words text-lg font-black ${tone}`} title={money(amount || 0)}>{priceShort(amount || 0)}</div>
          <div className="text-sm text-ink-mute">{sub}</div>
        </div>
      ))}
    </div>
  );
}

/** همه دریافت‌هایی که هنوز با رسید بانکی تطبیق نشده‌اند، در یک جا */
export function ReconcilePanel({ rows = [] }) {
  const list = rows.filter((r) => r.needsVerification);
  return (
    <Section className="mt-5" title="تطبیق دریافت با رسید بانکی"
      action={<span className="chip bg-plate-soft text-plate">{toFa(list.length)} خودرو</span>}>
      <p className="mb-3 max-w-[75ch] text-sm leading-7 text-ink-mute">
        صورت‌حساب بانک را کنار این فهرست بگذار. هر مبلغی که در حساب دیدی را با کد پیگیری تأیید کن؛ فقط دریافت تأییدشده «واقعاً وصول‌شده» حساب می‌شود.
        اعلام خریدار تا تأیید نشود از مانده کم نمی‌شود.
      </p>
      {!list.length ? <Empty>همه دریافت‌های ثبت‌شده با بانک تطبیق شده‌اند.</Empty> : (
        <div className="divide-y divide-line">
          {list.map((r) => (
            <div key={r._id} className="py-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Link href={`/cars/${r._id}#collection`} className="font-extrabold underline underline-offset-4">{carName(r.car)}</Link>
                <span className="text-sm text-ink-mute">{r.car?.buyerName || 'خریدار ثبت نشده'} · تأییدشده {priceShort(r.verifiedIn)} از {priceShort(r.salePrice)}</span>
              </div>
              {r.claims.length > 0 && <ul className="mb-2 space-y-2">{r.claims.map((cl) => <ClaimRow key={cl._id} carId={r._id} claim={cl} contractPending={r.contractPending} />)}</ul>}
              {r.clearedUnrecorded.length > 0 && <ul className="mb-2 space-y-2">{r.clearedUnrecorded.map((q) => <ChequeRecordRow key={q._id} carId={r._id} q={q} candidates={r.unverifiedTx} />)}</ul>}
              {r.unverifiedTx.length > 0 && <ul className="divide-y divide-line">{r.unverifiedTx.map((t) => <TxVerifyRow key={t._id} carId={r._id} t={t} />)}</ul>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

const KIND = { owner: 'مالک امانی', partner: 'شریک', commission: 'کمیسیون' };

/** خودروهای فروخته‌شده‌ای که هنوز به مالک امانی، شریک یا کمیسیون‌بگیر بدهی دارند */
export function OpenSettlements({ list = [] }) {
  return (
    <Section className="mt-5" title="تسویه با مالک امانی و شرکا"
      action={<span className="chip bg-amberx-soft text-amberx">{toFa(list.length)} خودرو با بدهی باز</span>}>
      {!list.length ? <Empty>برای خودروهای فروخته‌شده بدهی بازی به مالک امانی، شریک یا کمیسیون‌بگیر نیست.</Empty> : (
        <ul className="divide-y divide-line">
          {list.map((s) => (
            <li key={s._id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,1.1fr)]">
              <div className="min-w-0">
                <Link href={`/cars/${s._id}#settlement`} className="font-extrabold underline underline-offset-4">{carName(s)}</Link>
                <div className="mt-1 text-sm text-ink-mute">{s.ownership === 'consignment' ? 'امانی' : 'ملکی'}{s.buyerName ? ` · ${s.buyerName}` : ''}{s.saleDate ? ` · ${formatDate(s.saleDate)}` : ''}</div>
                <div className="mt-1 text-sm">فروش <b className="num">{priceShort(s.price)}</b> · وصول تأییدشده <b className="num text-cash">{priceShort(s.collected)}</b></div>
              </div>
              <ul className="space-y-1 text-sm">
                {s.parties.filter((p) => p.remaining !== 0).map((p) => (
                  <li key={p.key} className="flex flex-wrap justify-between gap-2">
                    <span><Badge>{KIND[p.kind]}</Badge> <b>{p.name}</b></span>
                    <span className={`num font-bold ${p.remaining > 0 ? 'text-alarm' : 'text-amberx'}`}>{p.remaining > 0 ? `باید بدهی ${priceShort(p.remaining)}` : `اضافه پرداخت ${priceShort(-p.remaining)}`}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl bg-paper p-3 text-sm">
                <div>برای نمایشگاه: <b className="num">{priceShort(s.showroom.share)}</b></div>
                <div className="mt-1">{s.payableNow >= s.owedToOthers
                  ? <span className="text-cash">پول رسیده برای تسویه کامل کافی است</span>
                  : <span className="text-alarm">فقط {priceShort(s.payableNow)} از {priceShort(s.owedToOthers)} با پول رسیده قابل پرداخت است</span>}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
