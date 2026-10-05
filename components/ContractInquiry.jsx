'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { INQUIRY_KINDS } from '@/lib/contractDocs';
import { formatDate, parseNumber, toFa } from '@/lib/persian';

const card = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';
const inp = 'rounded-lg border border-gray-200 px-3 py-2 text-sm';

/** استعلام خلافی و توقیف: آنلاین (اگر سرویس تنظیم شده) یا ثبت دستی نتیجه */
export default function ContractInquiry({ contract, online = {} }) {
  const router = useRouter();
  const [list, setList] = useState(contract.inquiries || []);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [manual, setManual] = useState(null); // kind
  const [form, setForm] = useState({});

  const send = async (kind, body) => {
    setBusy(kind);
    setErr('');
    try {
      const e = await api(`/api/contracts/${contract._id}/inquiry`, 'POST', { kind, ...body });
      setList([...list, e]);
      setManual(null);
      setForm({});
      router.refresh();
    } catch (ex) {
      setErr(ex.message);
    }
    setBusy('');
  };

  const last = (kind) => [...list].filter((q) => q.kind === kind && q.ok).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  const tone = (q) => (!q ? 'bg-gray-50 text-ink-mute' : (q.kind === 'fines' ? q.amount > 0 : q.seized) ? 'bg-alarm-soft text-alarm' : 'bg-cash-soft text-cash');

  return (
    <section className={card}>
      <h2 className="mb-3 font-black">استعلام خلافی و توقیف</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(INQUIRY_KINDS).map(([kind, label]) => {
          const q = last(kind);
          return (
            <div key={kind} className={`rounded-xl p-3 ${tone(q)}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold">{label}</div>
                <div className="flex gap-1">
                  {online[kind] && (
                    <button disabled={!!busy} onClick={() => send(kind, {})} className="rounded-lg bg-asphalt-900 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
                      {busy === kind ? '…' : 'استعلام آنلاین'}
                    </button>
                  )}
                  <button onClick={() => setManual(manual === kind ? null : kind)} className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-ink">ثبت دستی</button>
                </div>
              </div>
              <div className="mt-1 text-sm">{q ? `${q.summary} · ${formatDate(q.at)}${q.provider === 'manual' ? ' (دستی)' : ''}` : 'هنوز استعلام نشده'}</div>
              {q?.trackingCode && <div className="text-xs">کد پیگیری: {toFa(q.trackingCode)}</div>}

              {manual === kind && (
                <div className="mt-2 grid gap-2 rounded-lg bg-white p-2 text-ink">
                  {kind === 'fines' ? (
                    <input className={inp} inputMode="numeric" placeholder="مبلغ خلافی (ریال) — صفر یعنی ندارد" value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: parseNumber(e.target.value) })} />
                  ) : (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!form.seized} onChange={(e) => setForm({ ...form, seized: e.target.checked })} /> توقیف / منع معامله دارد
                    </label>
                  )}
                  <input className={inp} placeholder="کد پیگیری (اختیاری)" value={form.trackingCode || ''} onChange={(e) => setForm({ ...form, trackingCode: e.target.value })} />
                  <input className={inp} placeholder="توضیح / منبع (مثلاً سامانه پلیس من)" value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  <button disabled={!!busy} onClick={() => send(kind, { manual: form })} className="rounded-lg bg-asphalt-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">ثبت نتیجه</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!online.fines && !online.seizure && (
        <p className="mt-2 text-xs text-ink-mute">سرویس استعلام آنلاین تنظیم نشده؛ نتیجه را از سامانه‌های رسمی بگیر و اینجا ثبت کن (رسیدش را هم در «مدارک» بارگذاری کن).</p>
      )}
      {err && <p className="mt-2 rounded-lg bg-alarm-soft p-2 text-sm text-alarm">{err}</p>}
    </section>
  );
}
