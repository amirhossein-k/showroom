'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { findGuide, GUIDE_SECTIONS, CONTRACT_FORM_GUIDE } from '@/lib/guide';

// کارت «راهنمای این بخش» که بالای هر صفحه نمایش داده می‌شود.
// بار اول باز است؛ بعد از «فهمیدم» جمع می‌شود و فقط یک دکمه کوچک می‌ماند (در localStorage ذخیره می‌شود).

function List({ title, items, ordered }) {
  if (!items?.length) return null;
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <div>
      <div className="mb-1 text-sm font-black">{title}</div>
      <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-1 pr-5 text-sm leading-7 text-gray-700`}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </Tag>
    </div>
  );
}

export function GuideBody({ g, withForm = true }) {
  const form = withForm && g.ref === 'contract-form' ? CONTRACT_FORM_GUIDE : null;
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-gray-700">{g.what}</p>
      <List title="چه کارهایی می‌توانی بکنی" items={g.features} />
      <List title="از کجا شروع کنم" items={g.steps} ordered />
      <List title="نکته‌ها" items={g.tips} />
      {form && (
        <div className="space-y-4 rounded-xl bg-gray-50 p-3">
          <div className="font-black">{form.title}</div>
          <List title="بخش‌های فرم" items={form.features} />
          <List title="دو دکمه پایین فرم" items={form.steps} ordered />
          <List title="قبل از امضا بدان" items={form.tips} />
        </div>
      )}
    </div>
  );
}

export default function PageGuide() {
  const path = usePathname() || '/';
  const g = findGuide(path);
  const storeKey = g ? `guide:closed:${g.key}` : '';
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!g) return;
    let closed = false;
    try {
      closed = localStorage.getItem(storeKey) === '1';
    } catch {}
    setOpen(!closed);
    setReady(true);
  }, [storeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!g || g.hidden || path.includes('/print') || path.startsWith('/login')) return null;

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(storeKey, '1');
    } catch {}
  };

  if (!ready || !open)
    return (
      <div className="no-print mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600 shadow-sm hover:border-asphalt-900"
        >
          ❔ راهنمای این بخش
        </button>
      </div>
    );

  return (
    <section className="no-print mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-blue-700">راهنمای این بخش</div>
          <h2 className="text-lg font-black">{g.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/guide" className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
            راهنمای کامل
          </Link>
          <button type="button" onClick={close} className="rounded-lg bg-asphalt-900 px-3 py-1.5 text-xs font-bold text-white">
            فهمیدم
          </button>
        </div>
      </div>
      <GuideBody g={g} />
    </section>
  );
}

// برای ریست کردن همه راهنماها (دکمه در صفحه /guide)
export function ResetGuidesButton() {
  const [done, setDone] = useState(false);
  const reset = () => {
    try {
      GUIDE_SECTIONS.forEach((s) => localStorage.removeItem(`guide:closed:${s.key}`));
    } catch {}
    setDone(true);
  };
  return (
    <button type="button" onClick={reset} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-bold">
      {done ? '✓ همه راهنماها دوباره باز می‌شوند' : 'نمایش دوباره راهنمای همه صفحه‌ها'}
    </button>
  );
}
