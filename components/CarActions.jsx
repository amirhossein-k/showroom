'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toFa } from '@/lib/persian';

/** دکمه‌های تلگرام و قولنامه روی پرونده خودرو
 *  استفاده: <CarActions car={car} />
 */
export default function CarActions({ car }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const posted = !!car.channelPost?.messageId;
  const sold = ['sold', 'awaiting_transfer'].includes(car.status);

  const run = async (key, url, ok) => {
    setBusy(key);
    setMsg('');
    try {
      const r = await api(url, 'POST');
      setMsg(ok(r));
      router.refresh();
    } catch (e) {
      setMsg('❌ ' + e.message);
    } finally {
      setBusy('');
    }
  };

  const btn = 'rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!sold && (
          <Link href={`/cars/${car._id}/contract`} className={`${btn} border-asphalt-900 bg-asphalt-900 text-white`}>📝 ثبت قولنامه</Link>
        )}
        <button
          className={`${btn} border-sky-300 text-sky-700`}
          disabled={!!busy}
          onClick={() => run('post', `/api/cars/${car._id}/publish`, () => '✅ آگهی در کانال منتشر شد')}
        >
          {busy === 'post' ? '…' : posted ? '📢 انتشار دوباره در کانال' : '📢 انتشار در کانال'}
        </button>
        {posted && sold && !car.channelPost.soldMarked && (
          <button className={`${btn} border-green-300 text-green-700`} disabled={!!busy} onClick={() => run('sold', `/api/cars/${car._id}/publish?sold=1`, () => '✅ آگهی «فروخته شد» شد')}>
            ✅ علامت فروخته‌شد در کانال
          </button>
        )}
        {!sold && (
          <button
            className={`${btn} border-amber-300 text-amber-700`}
            disabled={!!busy}
            onClick={() =>
              run('notify', `/api/cars/${car._id}/notify-matches`, (r) => {
                const a = `✅ برای ${toFa(r.sent.length)} مشتری پیام رفت.`;
                const b = r.withoutTelegram?.length ? ` ${toFa(r.withoutTelegram.length)} مشتری مرتبط تلگرام وصل‌شده ندارند: ${r.withoutTelegram.map((c) => `${c.name} ${c.phone || ''}`).join('، ')}` : '';
                return a + b;
              })
            }
          >
            {busy === 'notify' ? '…' : '🔔 خبر به مشتری‌های منتظر'}
          </button>
        )}
      </div>
      {msg && <div className="text-sm leading-7">{msg}</div>}
    </div>
  );
}
