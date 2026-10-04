'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CAR_STATUS, EXPENSE_TYPES, COMMISSION_ROLES, DOC_GROUPS, ALL_DOC_KEYS, TX_CATEGORIES, TX_METHODS, LEAD_STATUS } from '@/lib/constants';
import { formatNumber, formatDate, priceWords, priceShort, relativeDays, toFa, parseNumber, toEnDigits } from '@/lib/persian';
import { Field, Money, Badge, ChequeStatusBadge, Empty } from './ui';
import { MoneyInput, JalaliDateInput, ErrorText, Modal, Toggle } from './inputs';
import { ChequeForm, TxForm } from './forms';
import { useSaver } from './useSaver';
import Icon from './Icon';
import { CarCover } from './CarCard';

function SaveBar({ s, onSave, dirty = true, label = 'ذخیره' }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button type="button" onClick={onSave} disabled={s.busy || !dirty} className="btn-dark">
        {s.busy ? 'در حال ذخیره…' : label}
      </button>
      {s.ok && <span className="text-sm font-bold text-cash">✓ ذخیره شد</span>}
      {s.err && <span className="text-sm font-bold text-alarm">{s.err}</span>}
    </div>
  );
}

export function Gallery({ car }) {
  const [i, setI] = useState(0);
  const imgs = car.images || [];
  return (
    <div>
      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-asphalt-800">
        {imgs.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[i]} alt="" className="h-full w-full object-cover" />
        ) : (
          <CarCover car={car} />
        )}
      </div>
      {imgs.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {imgs.map((src, k) => (
            <button key={src} onClick={() => setI(k)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${k === i ? 'border-road' : 'border-transparent opacity-70'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusPanel({ car, customers }) {
  const [status, setStatus] = useState(car.status);
  const [salePrice, setSalePrice] = useState(car.salePrice || car.askingPrice || 0);
  const [saleDate, setSaleDate] = useState(car.saleDate || new Date().toISOString());
  const [buyer, setBuyer] = useState(car.buyer || '');
  const [buyerName, setBuyerName] = useState(car.buyerName || '');
  const s = useSaver();
  const selling = ['sold', 'awaiting_transfer'].includes(status);

  const save = () =>
    s.run(async () => {
      const body = { status };
      if (selling) {
        const c = customers.find((x) => x._id === buyer);
        Object.assign(body, { salePrice, saleDate, buyer: buyer || null, buyerName: c?.name || buyerName });
        if (buyer) await api(`/api/customers/${buyer}`, 'PATCH', { status: 'won', lastContact: new Date().toISOString() });
      }
      await api(`/api/cars/${car._id}`, 'PATCH', body);
    });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(CAR_STATUS).map(([k, v]) => (
          <button key={k} type="button" onClick={() => setStatus(k)} className={`chip border-2 px-3 py-2 transition ${status === k ? 'border-asphalt-900 ' + v.cls : 'border-transparent bg-paper text-ink-soft hover:border-line'}`}>
            {v.label}
          </button>
        ))}
      </div>
      {selling && (
        <div className="mt-4 grid gap-4 rounded-2xl bg-paper p-4 sm:grid-cols-2">
          <Field label="قیمت فروش نهایی" className="sm:col-span-2">
            <MoneyInput value={salePrice} onChange={setSalePrice} />
          </Field>
          <Field label="تاریخ فروش">
            <JalaliDateInput value={saleDate} onChange={setSaleDate} />
          </Field>
          <Field label="خریدار">
            <select className="input" value={buyer} onChange={(e) => setBuyer(e.target.value)}>
              <option value="">— خریدار جدید (نام دستی) —</option>
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name} {c.phone ? `(${toFa(c.phone)})` : ''}</option>)}
            </select>
          </Field>
          {!buyer && (
            <Field label="نام خریدار" className="sm:col-span-2">
              <input className="input" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
            </Field>
          )}
        </div>
      )}
      <SaveBar s={s} onSave={save} dirty={status !== car.status || selling} label="ثبت وضعیت" />
    </div>
  );
}

export function ApplyPriceButton({ carId, price }) {
  const s = useSaver();
  return (
    <button type="button" className="btn-ghost" disabled={s.busy} onClick={() => s.run(() => api(`/api/cars/${carId}`, 'PATCH', { askingPrice: price }))}>
      {s.ok ? '✓ اعمال شد' : `قیمت آگهی = ${priceShort(price)}`}
    </button>
  );
}

export function ExpensesEditor({ carId, expenses }) {
  const [rows, setRows] = useState(expenses?.length ? expenses : []);
  const s = useSaver();
  const upd = (i, k, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const total = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  return (
    <div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r._id || i} className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-[150px_1fr_220px_auto]">
            <select className="input" value={r.type} onChange={(e) => upd(i, 'type', e.target.value)}>
              {Object.entries(EXPENSE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" placeholder="شرح" value={r.title || ''} onChange={(e) => upd(i, 'title', e.target.value)} />
            <div className="col-span-2 sm:col-span-1">
              <MoneyInput value={r.amount} onChange={(v) => upd(i, 'amount', v)} placeholder="مبلغ" />
            </div>
            <button type="button" className="btn-ghost col-span-2 self-start text-alarm sm:col-span-1" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="حذف">
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        {!rows.length && <Empty>هنوز هزینه‌ای ثبت نشده.</Empty>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-ghost" onClick={() => setRows([...rows, { type: 'repair', title: '', amount: 0, date: new Date().toISOString() }])}>
          <Icon name="plus" size={18} /> افزودن هزینه
        </button>
        <div className="text-left">
          <div className="num font-extrabold">جمع: {formatNumber(total)} تومان</div>
          {total > 0 && <div className="text-sm text-ink-mute">{priceWords(total)}</div>}
        </div>
      </div>
      <SaveBar s={s} onSave={() => s.run(() => api(`/api/cars/${carId}`, 'PATCH', { expenses: rows }))} />
    </div>
  );
}

export function PartnersEditor({ carId, partners, allPartners, split }) {
  const [rows, setRows] = useState(partners || []);
  const s = useSaver();
  const sum = rows.reduce((a, r) => a + (Number(r.share) || 0), 0);
  const upd = (i, patch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <select
              className="input flex-1"
              value={r.partner || ''}
              onChange={(e) => {
                const p = allPartners.find((x) => x._id === e.target.value);
                upd(i, { partner: p?._id, name: p?.name });
              }}
            >
              <option value="">انتخاب شریک…</option>
              {allPartners.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <div className="relative w-28">
              <input dir="ltr" inputMode="decimal" className="input num pl-8 text-left" value={r.share ? toFa(r.share) : ''} onChange={(e) => upd(i, { share: parseNumber(e.target.value) })} placeholder="۰" />
              <span className="absolute inset-y-0 left-3 flex items-center text-ink-mute">٪</span>
            </div>
            <button type="button" className="btn-ghost px-3 text-alarm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="حذف">
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost" onClick={() => setRows([...rows, { partner: '', name: '', share: 0 }])} disabled={!allPartners.length}>
          <Icon name="plus" size={18} /> افزودن شریک
        </button>
        {!allPartners.length && <Link href="/partners" className="text-sm font-bold text-plate">اول در صفحه شرکا، شریک تعریف کن</Link>}
        <span className={`text-sm font-bold ${sum > 100 ? 'text-alarm' : 'text-ink-mute'}`}>
          سهم شرکا {toFa(sum)}٪ · سهم نمایشگاه {toFa(Math.max(0, 100 - sum))}٪
        </span>
      </div>
      {sum > 100 && <p className="mt-2 text-sm font-bold text-alarm">جمع سهم‌ها نباید از ۱۰۰٪ بیشتر شود.</p>}
      <SaveBar s={s} dirty={sum <= 100} onSave={() => s.run(() => api(`/api/cars/${carId}`, 'PATCH', { partners: rows.filter((r) => r.partner) }))} />

      {split?.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[460px] text-[15px]">
            <thead>
              <tr className="text-right text-sm text-ink-mute">
                <th className="py-2 font-semibold">سهم‌دار</th>
                <th className="py-2 font-semibold">درصد</th>
                <th className="py-2 font-semibold">آورده سرمایه</th>
                <th className="py-2 font-semibold">سهم سود واقعی</th>
              </tr>
            </thead>
            <tbody>
              {split.map((p, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-2.5 font-bold">{p.name}</td>
                  <td className="num py-2.5">{toFa(p.share)}٪</td>
                  <td className="num py-2.5">{priceShort(p.capital)}</td>
                  <td className={`num py-2.5 font-extrabold ${p.profit < 0 ? 'text-alarm' : 'text-cash'}`}>{p.profit === null ? '—' : priceShort(p.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CommissionsEditor({ carId, commissions, refPrice }) {
  const [rows, setRows] = useState(commissions || []);
  const s = useSaver();
  const upd = (i, patch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const amount = (r) => (r.mode === 'percent' ? Math.round(((refPrice || 0) * (r.value || 0)) / 100) : r.value || 0);
  const total = rows.reduce((a, r) => a + amount(r), 0);
  return (
    <div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl border border-line bg-white p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_140px_auto]">
              <input className="input" placeholder="نام" value={r.name || ''} onChange={(e) => upd(i, { name: e.target.value })} />
              <select className="input" value={r.role || ''} onChange={(e) => upd(i, { role: e.target.value })}>
                <option value="">نقش</option>
                {COMMISSION_ROLES.map((x) => <option key={x}>{x}</option>)}
              </select>
              <div className="col-span-2 sm:col-span-1">
                <Toggle options={{ fixed: 'مبلغ ثابت', percent: 'درصد' }} value={r.mode || 'fixed'} onChange={(v) => upd(i, { mode: v, value: 0 })} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <div className="min-w-[200px] flex-1">
                {r.mode === 'percent' ? (
                  <div className="relative">
                    <input dir="ltr" inputMode="decimal" className="input num pl-8 text-left" value={r.value ? toFa(r.value) : ''} onChange={(e) => upd(i, { value: Number(toEnDigits(e.target.value).replace(/[^0-9.]/g, '')) || 0 })} placeholder="درصد از قیمت فروش" />
                    <span className="absolute inset-y-0 left-3 flex items-center text-ink-mute">٪</span>
                    <div className="mt-1 text-sm text-plate">= {formatNumber(amount(r))} تومان</div>
                  </div>
                ) : (
                  <MoneyInput value={r.value} onChange={(v) => upd(i, { value: v })} placeholder="مبلغ کمیسیون" />
                )}
              </div>
              <label className="flex min-h-[42px] items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 accent-[#1d7a50]" checked={!!r.paid} onChange={(e) => upd(i, { paid: e.target.checked })} />
                پرداخت شد
              </label>
              <button type="button" className="btn-ghost px-3 text-alarm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="حذف">
                <Icon name="trash" size={18} />
              </button>
            </div>
          </div>
        ))}
        {!rows.length && <Empty>کمیسیونی تعریف نشده.</Empty>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-ghost" onClick={() => setRows([...rows, { name: '', role: 'واسطه', mode: 'fixed', value: 0 }])}>
          <Icon name="plus" size={18} /> نفر جدید
        </button>
        <span className="num font-extrabold">جمع کمیسیون: {priceShort(total)} تومان</span>
      </div>
      <SaveBar s={s} onSave={() => s.run(() => api(`/api/cars/${carId}`, 'PATCH', { commissions: rows }))} />
    </div>
  );
}

export function DocsChecklist({ car }) {
  const [docs, setDocs] = useState(car.docs || {});
  const [ins, setIns] = useState(car.insuranceExpiry || null);
  const [insp, setInsp] = useState(car.inspectionExpiry || null);
  const s = useSaver();
  const done = ALL_DOC_KEYS.filter((d) => docs[d.key]).length;
  const toggle = (key) => {
    const next = { ...docs, [key]: !docs[key] };
    setDocs(next);
    s.run(() => api(`/api/cars/${car._id}`, 'PATCH', { docs: next }));
  };
  return (
    <div>
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm font-bold">
          <span>{toFa(done)} از {toFa(ALL_DOC_KEYS.length)} مورد</span>
          {s.ok && <span className="text-cash">✓</span>}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-cash transition-all" style={{ width: `${(done / ALL_DOC_KEYS.length) * 100}%` }} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {DOC_GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-2 text-sm font-extrabold text-ink-soft">{g.title}</div>
            <div className="space-y-1">
              {g.items.map((it) => (
                <label key={it.key} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${docs[it.key] ? 'bg-cash-soft' : 'hover:bg-paper'}`}>
                  <input type="checkbox" className="h-5 w-5 accent-[#1d7a50]" checked={!!docs[it.key]} onChange={() => toggle(it.key)} />
                  <span className={`text-[15px] ${docs[it.key] ? 'font-bold text-cash' : ''}`}>{it.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="انقضای بیمه شخص ثالث">
          <JalaliDateInput value={ins} onChange={setIns} maxYear={toFaYear() + 2} />
        </Field>
        <Field label="انقضای معاینه فنی">
          <JalaliDateInput value={insp} onChange={setInsp} maxYear={toFaYear() + 2} />
        </Field>
      </div>
      <SaveBar s={s} onSave={() => s.run(() => api(`/api/cars/${car._id}`, 'PATCH', { insuranceExpiry: ins, inspectionExpiry: insp }))} label="ذخیره تاریخ‌ها" />
    </div>
  );
}
function toFaYear() {
  // سال شمسی جاری
  const y = new Date().getFullYear();
  return y - 621;
}

export function CarLedger({ car, transactions, cheques, settlement }) {
  const [modal, setModal] = useState(null);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {settlement.sale && (
          <div className="rounded-2xl bg-paper p-4">
            <div className="text-sm font-bold text-ink-mute">تسویه خریدار</div>
            <div className="num mt-1 text-lg font-extrabold">{priceShort(settlement.sale.received)} از {priceShort(settlement.sale.total)}</div>
            <div className={`text-sm font-bold ${settlement.sale.remaining > 0 ? 'text-alarm' : 'text-cash'}`}>
              {settlement.sale.remaining > 0 ? `مانده: ${formatNumber(settlement.sale.remaining)} تومان` : 'تسویه کامل'}
            </div>
          </div>
        )}
        {settlement.purchase && (
          <div className="rounded-2xl bg-paper p-4">
            <div className="text-sm font-bold text-ink-mute">{car.ownership === 'consignment' ? 'بدهی به مالک امانی' : 'پرداخت به فروشنده'}</div>
            <div className="num mt-1 text-lg font-extrabold">{priceShort(settlement.purchase.paid)} از {priceShort(settlement.purchase.total)}</div>
            <div className={`text-sm font-bold ${settlement.purchase.remaining > 0 ? 'text-amberx' : 'text-cash'}`}>
              {settlement.purchase.remaining > 0 ? `مانده: ${formatNumber(settlement.purchase.remaining)} تومان` : 'تسویه کامل'}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => setModal('tx')}><Icon name="plus" size={18} /> ورودی / خروجی نقد</button>
        <button className="btn-ghost" onClick={() => setModal('cheque')}><Icon name="cheque" size={18} /> ثبت چک</button>
      </div>

      <div className="mt-4 divide-y divide-line">
        {transactions.map((t) => (
          <div key={t._id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="font-bold">{TX_CATEGORIES[t.category] || t.category} · <span className="font-medium text-ink-mute">{TX_METHODS[t.method]}</span></div>
              <div className="text-sm text-ink-mute">{formatDate(t.date)}{t.party ? ` · ${t.party}` : ''}</div>
            </div>
            <div className={`num text-left font-extrabold ${t.direction === 'in' ? 'text-cash' : 'text-alarm'}`}>
              {t.direction === 'in' ? '+' : '−'}{priceShort(t.amount)}
            </div>
          </div>
        ))}
        {cheques.map((q) => (
          <div key={q._id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="flex items-center gap-2 font-bold">
                چک {q.direction === 'received' ? 'دریافتی' : 'پرداختی'} {q.bank} <ChequeStatusBadge status={q.status} />
              </div>
              <div className="text-sm text-ink-mute">سررسید {formatDate(q.dueDate)} ({relativeDays(q.dueDate)}) · {q.party}</div>
            </div>
            <div className="num font-extrabold">{priceShort(q.amount)}</div>
          </div>
        ))}
        {!transactions.length && !cheques.length && <Empty>هنوز ورودی/خروجی برای این پرونده ثبت نشده.</Empty>}
      </div>

      <Modal open={modal === 'tx'} onClose={() => setModal(null)} title="ثبت ورودی/خروجی نقد">
        <TxForm fixedCar={car._id} defaults={{ direction: car.salePrice ? 'in' : 'out', category: car.salePrice ? 'sale' : 'purchase' }} onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'cheque'} onClose={() => setModal(null)} title="ثبت چک برای این خودرو">
        <ChequeForm fixedCar={car._id} onDone={() => setModal(null)} />
      </Modal>
    </div>
  );
}

export function InterestPanel({ carId, interested, matches }) {
  const s = useSaver();
  const link = (c) => s.run(() => api(`/api/customers/${c._id}`, 'PATCH', { interestedCars: [...(c.interestedCars || []).map((x) => x._id || x), carId] }));
  const Row = ({ c, action }) => (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-bold">
          {c.name} <Badge cls={LEAD_STATUS[c.status]?.cls}>{LEAD_STATUS[c.status]?.label}</Badge>
        </div>
        <div className="truncate text-sm text-ink-mute">
          {c.wanted || '—'}{c.nextFollowUp ? ` · پیگیری ${relativeDays(c.nextFollowUp)}` : ''}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {c.phone && (
          <a href={`tel:${c.phone}`} className="btn-ghost px-3" aria-label="تماس">
            <Icon name="phone" size={18} />
          </a>
        )}
        {action}
      </div>
    </div>
  );
  return (
    <div>
      <div className="divide-y divide-line">
        {interested.map((c) => <Row key={c._id} c={c} />)}
        {!interested.length && <Empty>هنوز مشتری به این خودرو وصل نشده.</Empty>}
      </div>
      {matches.length > 0 && (
        <>
          <div className="mb-1 mt-5 text-sm font-extrabold text-ink-soft">مشتری‌های هم‌خوان (بودجه یا خودروی مدنظر)</div>
          <div className="divide-y divide-line">
            {matches.map((c) => (
              <Row key={c._id} c={c} action={<button className="btn-blue px-3" disabled={s.busy} onClick={() => link(c)}>اتصال</button>} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
