'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** تنظیمات جدید: اطلاعات نمایشگاه برای قولنامه/آگهی + کانال تلگرام
 *  استفاده: در app/settings/page.js زیر <SettingsClient …/> بگذار: <SettingsExtra />
 */
export default function SettingsExtra() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api('/api/settings').then(setS).catch((e) => setMsg(e.message));
  }, []);
  if (!s) return <div className="text-sm text-ink-soft">{msg || 'در حال بارگذاری…'}</div>;
  const set = (k) => (e) => setS({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async () => {
    try {
      await api('/api/settings', 'PUT', {
        ownerName: s.ownerName,
        showroomPhone: s.showroomPhone,
        showroomAddress: s.showroomAddress,
        telegramChannelId: s.telegramChannelId,
        autoPostChannel: s.autoPostChannel !== false,
        autoNotifyMatches: s.autoNotifyMatches !== false,
      });
      setMsg('ذخیره شد ✅');
    } catch (e) {
      setMsg(e.message);
    }
  };
  const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2';
  return (
    <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
      <div className="font-bold">قولنامه و کانال تلگرام</div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block font-bold">نام مدیر (فروشنده در قولنامه)</span><input className={inp} value={s.ownerName || ''} onChange={set('ownerName')} /></label>
        <label className="text-sm"><span className="mb-1 block font-bold">تلفن نمایشگاه</span><input className={inp} value={s.showroomPhone || ''} onChange={set('showroomPhone')} /></label>
        <label className="text-sm md:col-span-2"><span className="mb-1 block font-bold">نشانی نمایشگاه</span><input className={inp} value={s.showroomAddress || ''} onChange={set('showroomAddress')} /></label>
        <label className="text-sm"><span className="mb-1 block font-bold">شناسه کانال (مثلاً @my_showroom)</span><input dir="ltr" className={inp} value={s.telegramChannelId || ''} onChange={set('telegramChannelId')} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.autoPostChannel !== false} onChange={set('autoPostChannel')} /> ماشین جدید خودکار در کانال منتشر شود</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.autoNotifyMatches !== false} onChange={set('autoNotifyMatches')} /> به مشتری‌های منتظر خودکار خبر داده شود</label>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} className="rounded-xl bg-asphalt-900 px-5 py-2 text-sm font-bold text-white">ذخیره</button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </section>
  );
}
