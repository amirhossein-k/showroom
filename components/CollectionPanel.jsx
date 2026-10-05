'use client';
// [collections] پیگیری وصول یک خودرو: سررسید، تماس‌ها، اعلام پرداخت خریدار و تطبیق با رسید بانکی
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { COLLECTION_STATUS, CONTACT_RESULTS, CONTACT_CHANNELS } from '@/lib/collections';
import { TX_METHODS } from '@/lib/constants';
import { formatDate, formatNumber, priceShort, relativeDays, toEnDigits, toFa } from '@/lib/persian';
import { Field, Badge, Empty } from './ui';
import { MoneyInput, JalaliDateInput, ErrorText } from './inputs';
import { useSaver } from './useSaver';

const money = (n) => `${formatNumber(n)} تومان`;
const post = (carId, body) => api(`/api/cars/${carId}/collection`, 'POST', body);

export function CollectionBadges({ c }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {c.awaiting && <Badge cls={c.overdue ? 'bg-alarm-soft text-alarm' : COLLECTION_STATUS.awaiting.cls}>{COLLECTION_STATUS.awaiting.label}{c.overdue ? ' · سررسید گذشته' : ''}</Badge>}
      {c.needsVerification && <Badge cls={COLLECTION_STATUS.needs_verification.cls}>{COLLECTION_STATUS.needs_verification.label}</Badge>}
      {!c.awaiting && !c.needsVerification && <Badge cls={COLLECTION_STATUS.settled.cls}>{COLLECTION_STATUS.settled.label}</Badge>}
    </span>
  );
}

function Num({ label, value, tone = '', hint }) {
  return (
    <div className="min-w-0 rounded-xl bg-paper p-3">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className={`num mt-1 break-words font-extrabold ${tone}`} title={money(value)}>{priceShort(value)}</dd>
      {hint && <dd className="mt-1 text-sm text-ink-mute">{hint}</dd>}
    </div>
  );
}

function Schedule({ carId, c, rec }) {
  const [due, setDue] = useState(rec.dueDate || null);
  const [next, setNext] = useState(rec.nextFollowUp || null);
  const s = useSaver();
  return (
    <div className="rounded-2xl border border-line p-4">
      <h3 className="mb-3 font-extrabold">سررسید و پیگیری</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="سررسید پرداخت مانده" hint={!rec.dueDate && c.dueSource === 'contract' ? `از قولنامه: ${formatDate(c.dueDate)}` : 'اگر خالی بماند، نزدیک‌ترین قسط قولنامه ملاک است.'}>
          <JalaliDateInput value={due} onChange={setDue} />
        </Field>
        <Field label="تاریخ پیگیری بعدی">
          <JalaliDateInput value={next} onChange={setNext} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="btn-dark" disabled={s.busy} onClick={() => s.run(() => post(carId, { action: 'schedule', dueDate: due, nextFollowUp: next }))}>
          {s.busy ? 'در حال ذخیره…' : 'ذخیره تاریخ‌ها'}
        </button>
        {s.ok && <span className="font-bold text-cash">✓ ذخیره شد</span>}
        <span className="text-ink-mute">
          آخرین تماس با خریدار: <b className="text-ink">{c.lastContactAt ? `${formatDate(c.lastContactAt)} (${relativeDays(c.lastContactAt)})` : 'ثبت نشده'}</b>
        </span>
      </div>
      <ErrorText error={s.err} />
    </div>
  );
}

function ContactLog({ carId, log = [], phone }) {
  const blank = { at: new Date().toISOString(), channel: 'phone', result: 'promised', note: '', promisedDate: null, nextFollowUp: null };
  const [f, setF] = useState(blank);
  const [all, setAll] = useState(false);
  const s = useSaver();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const rows = log.slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-extrabold">تماس با خریدار</h3>
        {phone && <a href={`tel:${phone}`} className="btn-ghost px-3 text-sm">تماس {toFa(phone)}</a>}
      </div>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); s.run(async () => { await post(carId, { action: 'contact', ...f }); setF(blank); }); }}>
        <Field label="تاریخ تماس"><JalaliDateInput value={f.at} onChange={(v) => set('at', v)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="روش">
            <select className="input" value={f.channel} onChange={(e) => set('channel', e.target.value)}>
              {Object.entries(CONTACT_CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="نتیجه">
            <select className="input" value={f.result} onChange={(e) => set('result', e.target.value)}>
              {Object.entries(CONTACT_RESULTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        {f.result === 'promised' && <Field label="قول پرداخت برای"><JalaliDateInput value={f.promisedDate} onChange={(v) => set('promisedDate', v)} /></Field>}
        <Field label="پیگیری بعدی" hint="خالی بماند: تاریخ قول پرداخت ملاک است."><JalaliDateInput value={f.nextFollowUp} onChange={(v) => set('nextFollowUp', v)} /></Field>
        <Field label="توضیح" className="sm:col-span-2"><input className="input" value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="مثلاً: گفت پنجشنبه ۲۰۰ میلیون واریز می‌کند" /></Field>
        <div className="sm:col-span-2">
          <ErrorText error={s.err} />
          <button className="btn-blue mt-2" disabled={s.busy}>{s.busy ? 'در حال ثبت…' : 'ثبت تماس'}</button>
          {f.result === 'claimed_paid' && <p className="mt-2 text-sm text-plate">اگر خریدار می‌گوید پول را زده، پایین‌تر «اعلام پرداخت» را هم با مبلغ و کد پیگیری ثبت کن تا برای تطبیق بانکی در صف بماند.</p>}
        </div>
      </form>
      <ul className="mt-4 divide-y divide-line">
        {(all ? rows : rows.slice(0, 4)).map((l, i) => (
          <li key={l._id || i} className="py-2.5 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <b>{CONTACT_RESULTS[l.result] || 'یادداشت'}</b>
              <span className="text-ink-mute">{formatDate(l.at)} · {CONTACT_CHANNELS[l.channel] || ''}</span>
            </div>
            {l.note && <p className="mt-1 break-words text-ink-soft">{l.note}</p>}
            {l.promisedDate && <p className="mt-1 text-amberx">قول پرداخت: {formatDate(l.promisedDate)}</p>}
          </li>
        ))}
        {!rows.length && <li className="py-3 text-sm text-ink-mute">هنوز تماسی ثبت نشده.</li>}
      </ul>
      {rows.length > 4 && <button type="button" className="btn-ghost mt-2 text-sm" onClick={() => setAll(!all)}>{all ? 'نمایش کمتر' : `همه ${toFa(rows.length)} تماس`}</button>}
    </div>
  );
}

function ClaimForm({ carId, remaining }) {
  const blank = { amount: 0, paidDate: new Date().toISOString(), method: 'transfer', reference: '', note: '' };
  const [f, setF] = useState(blank);
  const s = useSaver();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (f.amount > 0) s.run(async () => { await post(carId, { action: 'claim', ...f }); setF(blank); }); }}>
      <Field label="مبلغی که خریدار می‌گوید پرداخت کرده *" className="sm:col-span-2"><MoneyInput value={f.amount} onChange={(v) => set('amount', v)} /></Field>
      <Field label="تاریخ واریز اعلام‌شده"><JalaliDateInput value={f.paidDate} onChange={(v) => set('paidDate', v)} /></Field>
      <Field label="روش">
        <select className="input" value={f.method} onChange={(e) => set('method', e.target.value)}>
          {Object.entries(TX_METHODS).filter(([k]) => k !== 'cheque').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="کد پیگیری اعلامی خریدار"><input dir="ltr" className="input text-left" value={f.reference} onChange={(e) => set('reference', toEnDigits(e.target.value))} /></Field>
      <Field label="توضیح"><input className="input" value={f.note} onChange={(e) => set('note', e.target.value)} /></Field>
      <div className="sm:col-span-2">
        <ErrorText error={s.err} />
        {f.amount > remaining && remaining > 0 && <p className="mb-2 text-sm text-amberx">این مبلغ از مانده ثبت‌شده ({money(remaining)}) بیشتر است.</p>}
        <button className="btn-ghost" disabled={s.busy || !f.amount}>{s.busy ? 'در حال ثبت…' : 'ثبت اعلام پرداخت (هنوز وصول حساب نمی‌شود)'}</button>
      </div>
    </form>
  );
}

function VerifyFields({ f, set, method }) {
  return (
    <>
      <Field label={method === 'cash' ? 'شماره رسید صندوق (اختیاری)' : 'کد پیگیری / شماره مرجع در صورت‌حساب بانک *'}>
        <input dir="ltr" className="input text-left" value={f.bankRef} onChange={(e) => set('bankRef', toEnDigits(e.target.value))} />
      </Field>
      <Field label={method === 'cash' ? 'تاریخ تحویل وجه' : 'تاریخ نشستن پول در حساب'}>
        <JalaliDateInput value={f.bankDate} onChange={(v) => set('bankDate', v)} />
      </Field>
    </>
  );
}

export function ClaimRow({ carId, claim, contractPending }) {
  const [open, setOpen] = useState(false);
  const match = contractPending.find((p) => p.amount === claim.amount);
  const [f, setF] = useState({ bankRef: claim.reference || '', bankDate: claim.paidDate || null, method: claim.method || 'transfer', paymentId: match?._id || contractPending[0]?._id || '', note: '' });
  const s = useSaver();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <li className="rounded-xl border border-plate/30 bg-plate-soft/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-sm">
          <div className="num text-base font-extrabold">{money(claim.amount)}</div>
          <div className="mt-1 text-ink-mute">
            اعلام: {formatDate(claim.claimedAt)}{claim.paidDate ? ` · واریز: ${formatDate(claim.paidDate)}` : ''} · {TX_METHODS[claim.method] || claim.method}
            {claim.reference ? <> · کد: <bdi className="font-mono">{toFa(claim.reference)}</bdi></> : ''}
          </div>
          {claim.note && <div className="mt-1 break-words text-ink-soft">{claim.note}</div>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-blue px-3 text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'بستن' : 'تطبیق با بانک'}</button>
          <button type="button" className="btn-danger px-3 text-sm" disabled={s.busy} onClick={() => {
            const note = window.prompt('دلیل رد (مثلاً: در صورت‌حساب پیدا نشد)', 'در صورت‌حساب بانک پیدا نشد');
            if (note !== null) s.run(() => post(carId, { action: 'reject-claim', claimId: claim._id, note }));
          }}>رد</button>
        </div>
      </div>
      {open && (
        <form className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); s.run(() => post(carId, { action: 'verify-claim', claimId: claim._id, ...f })); }}>
          <p className="text-sm leading-7 text-ink-soft sm:col-span-2">صورت‌حساب بانک را باز کن و فقط وقتی همین مبلغ را دیدی تأیید کن. بعد از تأیید، این مبلغ به‌عنوان «وصول‌شده» ثبت و از مانده کم می‌شود.</p>
          <Field label="روش واقعی">
            <select className="input" value={f.method} onChange={(e) => set('method', e.target.value)}>
              {Object.entries(TX_METHODS).filter(([k]) => k !== 'cheque').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          {contractPending.length > 0 && (
            <Field label="ردیف قولنامه‌ای که پرداخت شد *">
              <select className="input" value={f.paymentId} onChange={(e) => set('paymentId', e.target.value)}>
                {contractPending.map((p) => <option key={p._id} value={p._id}>{toFa(p.contractNumber)} · {priceShort(p.amount)} · {p.dueDate ? formatDate(p.dueDate) : 'بدون سررسید'}</option>)}
              </select>
            </Field>
          )}
          <VerifyFields f={f} set={set} method={f.method} />
          <div className="sm:col-span-2">
            <ErrorText error={s.err} />
            <button className="btn-dark mt-1" disabled={s.busy}>{s.busy ? 'در حال ثبت…' : 'رسید بانکی را دیدم؛ وصول را تأیید کن'}</button>
          </div>
        </form>
      )}
    </li>
  );
}

export function TxVerifyRow({ carId, t }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ bankRef: t.bankRef || '', bankDate: t.bankDate || t.date || null });
  const s = useSaver();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-sm">
          <div className="num font-extrabold">{money(t.amount)}</div>
          <div className="mt-1 text-ink-mute">{formatDate(t.date)} · {TX_METHODS[t.method] || t.method}{t.party ? ` · ${t.party}` : ''}{t.contract ? ' · از قولنامه' : ''}</div>
          {t.verified && <div className="mt-1 text-cash">✓ تطبیق‌شده{t.bankRef ? <> · مرجع <bdi className="font-mono">{toFa(t.bankRef)}</bdi></> : ''}{t.bankDate ? ` · ${formatDate(t.bankDate)}` : ''}</div>}
        </div>
        {t.verified
          ? <button type="button" className="btn-ghost px-3 text-sm" disabled={s.busy} onClick={() => window.confirm('تطبیق بانکی این دریافت برداشته شود؟') && s.run(() => post(carId, { action: 'unverify-tx', txId: t._id }))}>لغو تطبیق</button>
          : <button type="button" className="btn-blue px-3 text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'بستن' : 'تطبیق با رسید'}</button>}
      </div>
      {open && !t.verified && (
        <form className="mt-3 grid gap-3 rounded-xl bg-paper p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); s.run(() => post(carId, { action: 'verify-tx', txId: t._id, ...f })); }}>
          <VerifyFields f={f} set={set} method={t.method} />
          <div className="sm:col-span-2"><ErrorText error={s.err} /><button className="btn-dark mt-1" disabled={s.busy}>تأیید وصول</button></div>
        </form>
      )}
      {!open && <ErrorText error={s.err} />}
    </li>
  );
}

export function ChequeRecordRow({ carId, q, candidates }) {
  const [f, setF] = useState({ bankDate: q.dueDate || null, txId: '' });
  const s = useSaver();
  const same = candidates.filter((t) => t.amount === q.amount && !t.cheque);
  return (
    <li className="rounded-xl border border-amberx/30 bg-amberx-soft/50 p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <b>چک {q.number ? toFa(q.number) : ''} {q.bank || ''} · <span className="num">{money(q.amount)}</span></b>
        <span className="text-ink-mute">سررسید {formatDate(q.dueDate)}</span>
      </div>
      <p className="mt-1 text-ink-soft">در دفتر چک «پاس شد» است اما دریافتش در دفتر نقدینگی ثبت نشده؛ بنابراین هنوز از مانده کم نشده.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="تاریخ وصول در حساب"><JalaliDateInput value={f.bankDate} onChange={(v) => setF((x) => ({ ...x, bankDate: v }))} /></Field>
        {same.length > 0 && (
          <Field label="دریافت این چک قبلاً دستی ثبت شده؟">
            <select className="input" value={f.txId} onChange={(e) => setF((x) => ({ ...x, txId: e.target.value }))}>
              <option value="">نه، دریافت جدید بساز</option>
              {same.map((t) => <option key={t._id} value={t._id}>اتصال به دریافت {formatDate(t.date)} · {priceShort(t.amount)}</option>)}
            </select>
          </Field>
        )}
      </div>
      <ErrorText error={s.err} />
      <button type="button" className="btn-dark mt-3" disabled={s.busy} onClick={() => s.run(() => post(carId, { action: 'record-cheque', chequeId: q._id, ...f }))}>
        {f.txId ? 'اتصال و تأیید' : 'ثبت به‌عنوان دریافت تأییدشده'}
      </button>
    </li>
  );
}

export default function CollectionPanel({ car, c, phone }) {
  const rec = car.receivable || {};
  const allSaleIn = [...c.unverifiedTx, ...c.verifiedTx].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const [showVerified, setShowVerified] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CollectionBadges c={c} />
        {c.dueDate && c.awaiting && (
          <span className={`text-sm font-bold ${c.overdue ? 'text-alarm' : 'text-ink-soft'}`}>
            سررسید {formatDate(c.dueDate)} ({relativeDays(c.dueDate)}){c.dueSource === 'contract' ? ' · از قولنامه' : ''}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Num label="وصول تأییدشده با بانک" value={c.verifiedIn} tone="text-cash" hint="پول واقعاً رسیده" />
        <Num label="ثبت‌شده، تطبیق‌نشده" value={c.unverifiedIn} tone={c.unverifiedIn ? 'text-plate' : ''} hint="در دفتر هست، رسیدش دیده نشده" />
        <Num label="اعلام خریدار، بررسی‌نشده" value={c.claimedAmount} tone={c.claimedAmount ? 'text-plate' : ''} hint="از مانده کم نشده" />
        <Num label="چک دریافتی در جریان" value={c.pendingChequeAmount} hint={c.nextChequeDue ? `نزدیک‌ترین: ${formatDate(c.nextChequeDue)}` : 'وصول‌شده حساب نمی‌شود'} />
        <Num label="مبلغ فروش" value={c.salePrice} />
        <Num label="مانده ثبت‌شده" value={Math.max(0, c.remaining)} tone={c.remaining > 0 ? 'text-amberx' : 'text-cash'} hint="فروش − دریافت‌های ثبت‌شده" />
        <Num label="هنوز واقعاً وصول نشده" value={Math.max(0, c.unverifiedRemaining)} tone={c.unverifiedRemaining > 0 ? 'text-alarm' : 'text-cash'} hint="فروش − وصول تأییدشده" />
      </dl>

      <div className="grid gap-4 xl:grid-cols-2">
        <Schedule carId={car._id} c={c} rec={rec} />
        <ContactLog carId={car._id} log={rec.log} phone={phone} />
      </div>

      <div className="rounded-2xl border border-line p-4">
        <h3 className="mb-1 font-extrabold">اعلام پرداخت خریدار</h3>
        <p className="mb-3 text-sm leading-7 text-ink-mute">وقتی خریدار می‌گوید پول را زده ولی هنوز در حساب ندیده‌ای، اینجا ثبت کن. تا با صورت‌حساب بانک تطبیق نشود، وصول‌شده حساب نمی‌شود.</p>
        {c.claims.length > 0 && <ul className="mb-4 space-y-2">{c.claims.map((cl) => <ClaimRow key={cl._id} carId={car._id} claim={cl} contractPending={c.contractPending} />)}</ul>}
        {c.hasContract && !c.contractPending.length && <p className="mb-3 text-sm text-amberx">قولنامه این خودرو ردیف نقدی/حواله‌ای پرداخت‌نشده ندارد؛ چک‌ها از دفتر چک وصول می‌شوند.</p>}
        <ClaimForm carId={car._id} remaining={c.remaining} />
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold">تطبیق دریافت‌ها با رسید بانکی</h3>
          {c.verifiedTx.length > 0 && <button type="button" className="btn-ghost px-3 text-sm" onClick={() => setShowVerified(!showVerified)}>{showVerified ? 'فقط تطبیق‌نشده‌ها' : `نمایش ${toFa(c.verifiedTx.length)} تطبیق‌شده`}</button>}
        </div>
        <p className="mb-2 text-sm leading-7 text-ink-mute">هر دریافت ثبت‌شده را با کد پیگیری صورت‌حساب بانک تأیید کن. یک کد پیگیری فقط یک بار پذیرفته می‌شود تا پولی دو بار شمرده نشود.</p>
        {c.clearedUnrecorded.length > 0 && <ul className="mb-3 space-y-2">{c.clearedUnrecorded.map((q) => <ChequeRecordRow key={q._id} carId={car._id} q={q} candidates={c.unverifiedTx} />)}</ul>}
        <ul className="divide-y divide-line">
          {(showVerified ? allSaleIn : c.unverifiedTx).map((t) => <TxVerifyRow key={t._id} carId={car._id} t={t} />)}
        </ul>
        {!c.unverifiedTx.length && !c.clearedUnrecorded.length && !showVerified && <Empty>{c.recordedIn ? 'همه دریافت‌های ثبت‌شده با بانک تطبیق شده‌اند.' : 'هنوز دریافتی از خریدار ثبت نشده.'}</Empty>}
        {c.hasContract && <p className="mt-3 text-sm text-ink-mute">دریافت‌های قولنامه از <Link className="font-bold text-plate underline" href="/contracts">مدیریت قولنامه</Link> ثبت می‌شوند؛ تطبیق بانکی‌شان همین‌جاست.</p>}
      </div>
    </div>
  );
}
