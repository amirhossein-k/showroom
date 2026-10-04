'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BODY_PARTS, STRUCT_PARTS, BODY_STATES, TECH_ITEMS, TECH_STATES, bodySummary } from '@/lib/inspection';
import { JalaliDateInput } from './inputs';
import { toFa, parseNumber } from '@/lib/persian';

/**
 * کارشناسی بدنه و فنی
 * استفاده: <BodyInspection carId={car._id} initial={car.inspection} />
 */
export default function BodyInspection({ carId, initial }) {
  const router = useRouter();
  const [insp, setInsp] = useState({ body: {}, tech: {}, ...(initial || {}) });
  const [brush, setBrush] = useState('painted');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const setBody = (key) =>
    setInsp((p) => {
      const cur = p.body?.[key];
      // کلیک دوباره با همان قلم = برگشت به سالم
      const next = cur === brush ? 'ok' : brush;
      return { ...p, body: { ...p.body, [key]: next } };
    });
  const setTech = (key, v) => setInsp((p) => ({ ...p, tech: { ...p.tech, [key]: v } }));
  const allOk = () =>
    setInsp((p) => ({ ...p, body: Object.fromEntries([...BODY_PARTS, ...STRUCT_PARTS].map((x) => [x.key, 'ok'])) }));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api(`/api/cars/${carId}`, 'PATCH', { inspection: { ...insp, date: insp.date || new Date().toISOString() } });
      setMsg('ذخیره شد ✅');
      router.refresh();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const color = (key) => BODY_STATES[insp.body?.[key]]?.color || '#e5e7eb';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink-soft">قلم:</span>
        {Object.entries(BODY_STATES).map(([k, s]) => (
          <button
            key={k}
            type="button"
            onClick={() => setBrush(k)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${brush === k ? 'border-asphalt-900 bg-asphalt-900 text-white' : 'border-gray-200 bg-white'}`}
          >
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
        <button type="button" onClick={allOk} className="mr-auto rounded-lg border border-green-300 px-2.5 py-1.5 text-xs font-bold text-green-700">
          همه سالم
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <svg viewBox="0 0 220 422" className="mx-auto w-56 select-none" role="img" aria-label="نقشه بدنه">
          {/* شیشه جلو و عقب */}
          <rect x="56" y="120" width="108" height="36" rx="6" fill="#cbd5e1" opacity=".5" />
          <rect x="56" y="274" width="108" height="38" rx="6" fill="#cbd5e1" opacity=".5" />
          {BODY_PARTS.map((p) => (
            <g key={p.key} onClick={() => setBody(p.key)} className="cursor-pointer">
              <title>{`${p.label}: ${BODY_STATES[insp.body?.[p.key]]?.label || 'ثبت نشده'}`}</title>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} fill={color(p.key)} stroke="#334155" strokeWidth="1.5" />
            </g>
          ))}
          <text x="110" y="4" textAnchor="middle" fontSize="7" fill="#64748b">جلو</text>
        </svg>

        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-bold">قطعات ساختاری</div>
            <div className="flex flex-wrap gap-2">
              {STRUCT_PARTS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setBody(p.key)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold"
                >
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: color(p.key) }} />
                  {p.label}: {BODY_STATES[insp.body?.[p.key]]?.label || '—'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-3 text-sm leading-7">{bodySummary(insp)}</div>

          <div>
            <div className="mb-2 text-sm font-bold">وضعیت فنی</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {TECH_ITEMS.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                  <span className="text-sm">{t.label}</span>
                  <div className="flex gap-1">
                    {Object.entries(TECH_STATES).map(([k, s]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTech(t.key, k)}
                        title={s.label}
                        className={`rounded-md px-2 py-1 text-[11px] font-bold ${insp.tech?.[t.key] === k ? 'text-white' : 'bg-gray-100 text-ink-soft'}`}
                        style={insp.tech?.[t.key] === k ? { background: s.color } : undefined}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-bold">آج لاستیک (٪)</span>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                inputMode="numeric"
                value={insp.tiresPct ? toFa(insp.tiresPct) : ''}
                onChange={(e) => setInsp((p) => ({ ...p, tiresPct: Math.min(100, parseNumber(e.target.value)) }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-bold">کارشناس</span>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" value={insp.inspector || ''} onChange={(e) => setInsp((p) => ({ ...p, inspector: e.target.value }))} />
            </label>
            <div className="text-sm">
              <span className="mb-1 block font-bold">تاریخ کارشناسی</span>
              <JalaliDateInput value={insp.date} onChange={(v) => setInsp((p) => ({ ...p, date: v }))} />
            </div>
          </div>
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="توضیحات کارشناس (مثلاً: تعویض روغن نزدیک است، صدای جلوبندی…)"
            value={insp.notes || ''}
            onChange={(e) => setInsp((p) => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <button type="button" disabled={saving} onClick={save} className="rounded-xl bg-asphalt-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {saving ? 'در حال ذخیره…' : 'ذخیره کارشناسی'}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
