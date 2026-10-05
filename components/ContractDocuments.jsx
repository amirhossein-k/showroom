'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { DOC_TYPES, REQUIRED_DOCS } from '@/lib/contractDocs';
import { formatDate, toFa } from '@/lib/persian';

const card = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';
const kb = (n) => `${toFa(Math.max(1, Math.round((n || 0) / 1024)))} KB`;

/** آپلود و مدیریت مدارک امضاشده کنار هر قرارداد (اسکن قولنامه، کارت ملی، کارت خودرو…) */
export default function ContractDocuments({ contractId, initial = [], status }) {
  const [docs, setDocs] = useState(initial);
  const [type, setType] = useState(REQUIRED_DOCS.find((k) => !initial.some((d) => d.type === k)) || 'other');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const url = (d) => `/api/contracts/${contractId}/documents/${d._id}`;

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('type', type);
      if (title) fd.append('title', title);
      [...files].forEach((f) => fd.append('files', f));
      const r = await api(`/api/contracts/${contractId}/documents`, 'POST', fd);
      setDocs(r.documents);
      setTitle('');
      if (r.skipped?.length) setMsg(r.skipped.join('\n'));
      const next = REQUIRED_DOCS.find((k) => !r.documents.some((d) => d.type === k));
      if (next) setType(next);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  };

  const remove = async (d) => {
    if (!confirm(`«${d.title}» حذف شود؟`)) return;
    try {
      await api(url(d), 'DELETE');
      setDocs(docs.filter((x) => x._id !== d._id));
    } catch (e) {
      setMsg(e.message);
    }
  };

  const have = new Set(docs.map((d) => d.type));
  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-black">مدارک قرارداد</h2>
        <div className="flex flex-wrap gap-1">
          {REQUIRED_DOCS.map((k) => (
            <span key={k} className={`rounded-full px-2 py-0.5 text-xs ${have.has(k) ? 'bg-cash-soft text-cash' : 'bg-amberx-soft text-amberx'}`}>
              {have.has(k) ? '✓' : '○'} {DOC_TYPES[k].label}
            </span>
          ))}
        </div>
      </div>
      {status === 'signed' && REQUIRED_DOCS.some((k) => !have.has(k)) && (
        <p className="mb-3 rounded-lg bg-amberx-soft p-2 text-xs text-amberx">قرارداد امضا شده ولی مدارک لازم کامل نیست. اسکن نسخه امضاشده را حتماً بارگذاری کن.</p>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
        <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(DOC_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}{have.has(k) ? ' ✓' : ''}</option>
          ))}
        </select>
        <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="عنوان (اختیاری)، مثلاً «پشت کارت»" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className={`cursor-pointer rounded-lg bg-asphalt-900 px-4 py-2 text-center text-sm font-bold text-white ${busy ? 'opacity-50' : ''}`}>
          {busy ? 'در حال آپلود…' : 'انتخاب فایل'}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        </label>
      </div>
      <p className="mb-3 text-xs text-ink-mute">تصویر یا PDF، هر فایل حداکثر ۴ مگابایت. فایل‌ها خصوصی ذخیره می‌شوند و فقط بعد از ورود قابل مشاهده‌اند.</p>
      {msg && <p className="mb-3 whitespace-pre-line rounded-lg bg-alarm-soft p-2 text-sm text-alarm">{msg}</p>}

      {!docs.length && <p className="text-sm text-ink-mute">هنوز مدرکی بارگذاری نشده.</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <div key={d._id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-2">
            <a href={url(d)} target="_blank" rel="noreferrer" className="shrink-0">
              {d.mime?.startsWith('image/') ? (
                <img src={url(d)} alt={d.title} className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-alarm-soft text-xs font-black text-alarm">PDF</div>
              )}
            </a>
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-bold">{d.title}</div>
              <div className="truncate text-xs text-ink-mute">{DOC_TYPES[d.type]?.label} · {kb(d.size)} · {formatDate(d.uploadedAt)}</div>
            </div>
            <button onClick={() => remove(d)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">حذف</button>
          </div>
        ))}
      </div>
    </section>
  );
}
