'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Modal } from './inputs';
import { formatDate, formatNumber, priceShort, toFa, relativeDays } from '@/lib/persian';
import { CONTRACT_STATUS, PAYMENT_KINDS, PAYMENT_STATUS, HISTORY_LABELS, paymentStatus, contractSummary } from '@/lib/contractDefaults';

const card = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';
const btn = 'rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50';

function Stat({ label, value, tone = '' }) {
  return (
    <div className={`${card} ${tone}`}>
      <div className="text-xs text-ink-mute">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

export default function ContractManager({ contract: c }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(false);
  const s = contractSummary(c);
  const car = c.car || {};
  const st = CONTRACT_STATUS[c.status] || CONTRACT_STATUS.draft;

  const run = async (key, fn) => {
    setErr('');
    setBusy(key);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };
  const action = (a, extra = {}) => run(a, () => api(`/api/contracts/${c._id}/status`, 'POST', { action: a, ...extra }));
  const setPay = (pid, status) => run(pid, () => api(`/api/contracts/${c._id}/payments/${pid}`, 'PATCH', { status }));
  const remove = () =>
    confirm('قرارداد حذف شود؟') &&
    run('del', async () => {
      await api(`/api/contracts/${c._id}`, 'DELETE');
      router.push('/contracts');
    });

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black">قولنامه {toFa(c.number)}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {car._id ? (
              <Link href={`/cars/${car._id}`} className="underline">
                {car.brand} {car.model} {toFa(car.year || '')}
              </Link>
            ) : (
              'خودرو حذف شده'
            )}{' '}
            · خریدار: {c.buyer?.name} · {formatDate(c.date)}
          </p>
          {c.status === 'cancelled' && c.cancelReason && <p className="mt-1 text-sm text-alarm">علت لغو: {c.cancelReason}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/contracts/${c._id}/print`} className={`${btn} bg-gray-100`}>🖨️ چاپ</Link>
          {c.status === 'draft' && (
            <>
              <Link href={`/contracts/${c._id}/edit`} className={`${btn} bg-gray-100`}>ویرایش</Link>
              <button disabled={!!busy} onClick={() => confirm('امضا و نهایی شود؟ چک‌ها وارد دفتر چک می‌شوند.') && action('sign')} className={`${btn} bg-asphalt-900 text-white`}>
                {busy === 'sign' ? '…' : 'امضا و نهایی‌سازی'}
              </button>
            </>
          )}
          {c.status === 'signed' && !c.deliveredAt && (
            <button disabled={!!busy} onClick={() => action('deliver')} className={`${btn} bg-plate-soft text-plate`}>ثبت تحویل خودرو</button>
          )}
          {c.status === 'signed' && !c.transferredAt && (
            <button disabled={!!busy} onClick={() => confirm('انتقال سند انجام شد؟ خودرو «فروخته‌شده» می‌شود.') && action('transfer')} className={`${btn} bg-cash-soft text-cash`}>
              ثبت انتقال سند
            </button>
          )}
          {c.status !== 'cancelled' && (
            <button disabled={!!busy} onClick={() => setCancelOpen(true)} className={`${btn} bg-alarm-soft text-alarm`}>لغو قرارداد</button>
          )}
          {c.status !== 'signed' && (
            <button disabled={!!busy} onClick={remove} className={`${btn} text-red-600`}>حذف</button>
          )}
        </div>
      </div>

      {err && <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 font-sans text-sm text-red-600">{err}</pre>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="مبلغ کل" value={`${priceShort(s.total)} تومان`} />
        <Stat label="دریافت‌شده" value={`${priceShort(s.paid)} تومان`} tone="text-cash" />
        <Stat label="مانده" value={`${priceShort(s.remaining)} تومان`} />
        <Stat
          label="معوق / برگشتی"
          value={`${toFa(s.overdueCount)} قسط معوق · ${toFa(s.bouncedCount)} برگشتی`}
          tone={s.overdueCount || s.bouncedCount ? 'border-alarm text-alarm' : ''}
        />
      </div>

      {c.status === 'signed' && (
        <div className={`${card} grid gap-3 text-sm sm:grid-cols-3`}>
          <div>
            <div className="text-ink-mute">تحویل خودرو</div>
            <div className="font-bold">
              {formatDate(c.deliveryDate)} {c.deliveredAt ? `✓ تحویل شد (${formatDate(c.deliveredAt)})` : s.deliveryLate ? <span className="text-alarm">· {toFa(s.deliveryLate)} روز تأخیر</span> : `· ${relativeDays(c.deliveryDate)}`}
            </div>
          </div>
          <div>
            <div className="text-ink-mute">حضور در دفترخانه</div>
            <div className="font-bold">
              {formatDate(c.transferDate)} {c.transferredAt ? `✓ منتقل شد (${formatDate(c.transferredAt)})` : s.transferLate ? <span className="text-alarm">· {toFa(s.transferLate)} روز تأخیر</span> : `· ${relativeDays(c.transferDate)}`}
            </div>
          </div>
          <div>
            <div className="text-ink-mute">وجه التزام روزانه</div>
            <div className="font-bold">
              {formatNumber(c.penaltyPerDay)} تومان
              {s.penaltyAccrued > 0 && <span className="text-alarm"> · تاکنون {priceShort(s.penaltyAccrued)}</span>}
            </div>
          </div>
        </div>
      )}

      <div className={card}>
        <h2 className="mb-3 text-sm font-black">برنامه پرداخت</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-ink-mute">
                {['#', 'نوع', 'مبلغ', 'سررسید', 'بانک / شماره', 'وضعیت', ''].map((h) => (
                  <th key={h} className="p-2 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.payments.map((p, i) => {
                const ps = paymentStatus(p);
                const late = ps === 'pending' && p.dueDate && new Date(p.dueDate) < new Date();
                return (
                  <tr key={p._id || i} className={`border-b last:border-0 ${late ? 'bg-red-50' : ''}`}>
                    <td className="p-2">{toFa(i + 1)}</td>
                    <td className="p-2">{PAYMENT_KINDS[p.kind]}</td>
                    <td className="p-2 font-bold">{formatNumber(p.amount)}</td>
                    <td className="p-2">
                      {formatDate(p.dueDate)}
                      {late && <span className="mr-1 text-xs text-alarm">({relativeDays(p.dueDate)})</span>}
                    </td>
                    <td className="p-2 text-xs">
                      {p.bank || '—'} {p.number ? `· ${toFa(p.number)}` : ''} {p.sayadId ? `· صیادی ${toFa(p.sayadId)}` : ''}
                    </td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PAYMENT_STATUS[ps].cls}`}>{PAYMENT_STATUS[ps].label}</span>
                      {p.paidAt && ps === 'paid' && <span className="mr-1 text-xs text-ink-mute">{formatDate(p.paidAt)}</span>}
                    </td>
                    <td className="p-2">
                      {c.status === 'signed' && (
                        <select
                          disabled={busy === p._id}
                          value={ps}
                          onChange={(e) => setPay(p._id, e.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                        >
                          <option value="pending">در انتظار</option>
                          <option value="paid">{p.kind === 'cheque' ? 'پاس شد' : 'دریافت شد'}</option>
                          {p.kind === 'cheque' && <option value="bounced">برگشت خورد</option>}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {c.payments.some((p) => p.kind === 'cheque') && c.status === 'signed' && (
          <p className="mt-2 text-xs text-ink-mute">
            وضعیت چک‌ها با <Link href="/cheques" className="underline">دفتر چک</Link> دوطرفه همگام است.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h2 className="mb-2 text-sm font-black">طرفین و شهود</h2>
          {[
            ['فروشنده', c.seller],
            ['خریدار', c.buyer],
          ].map(([t, p]) => (
            <p key={t} className="text-sm leading-7">
              <b>{t}:</b> {p?.name} {p?.fatherName ? `فرزند ${p.fatherName}` : ''} · کد ملی {toFa(p?.nationalId || '—')} · {toFa(p?.phone || '')}
            </p>
          ))}
          {(c.witnesses || []).map((w, i) => (
            <p key={i} className="text-sm leading-7">
              <b>شاهد {toFa(i + 1)}:</b> {w.name} {w.nationalId ? `· کد ملی ${toFa(w.nationalId)}` : ''}
            </p>
          ))}
          {c.notes && <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm">📝 {c.notes}</p>}
        </div>
        <div className={card}>
          <h2 className="mb-2 text-sm font-black">تاریخچه</h2>
          <ul className="space-y-1 text-sm">
            {[...(c.history || [])].reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {HISTORY_LABELS[h.action] || h.action}
                  {h.note ? ` — ${h.note}` : ''}
                </span>
                <span className="text-xs text-ink-mute">{formatDate(h.at)}</span>
              </li>
            ))}
            {!c.history?.length && <li className="text-ink-mute">—</li>}
          </ul>
        </div>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="لغو قرارداد">
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            {c.status === 'signed'
              ? 'چک‌های در جریان «باطل/عودت» می‌شوند و خودرو به موجودی برمی‌گردد. سوابق مالی حذف نمی‌شوند.'
              : 'این پیش‌نویس لغو می‌شود.'}
          </p>
          <textarea className="w-full rounded-lg border border-gray-200 p-2 text-sm" rows={3} placeholder="علت لغو (مثلاً انصراف خریدار، برگشت چک)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {c.status === 'signed' && s.paid > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
              استرداد {priceShort(s.paid)} تومان دریافتی در دفتر نقدینگی ثبت شود
            </label>
          )}
          <button
            disabled={!reason.trim() || !!busy}
            onClick={async () => {
              await action('cancel', { reason, refund });
              setCancelOpen(false);
            }}
            className={`${btn} w-full bg-alarm text-white`}
          >
            تأیید لغو
          </button>
        </div>
      </Modal>
    </div>
  );
}
