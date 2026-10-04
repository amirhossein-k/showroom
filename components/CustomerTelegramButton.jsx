'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

/** لینک دعوت مشتری به ربات. بعد از اینکه مشتری لینک را بزند، تلگرامش به پرونده وصل می‌شود.
 *  استفاده: <CustomerTelegramButton customer={c} />
 */
export default function CustomerTelegramButton({ customer }) {
  const [msg, setMsg] = useState('');
  if (customer.telegramChatId) return <span className="text-xs font-bold text-green-700">✓ تلگرام وصل است</span>;
  const go = async () => {
    try {
      const { url } = await api(`/api/customers/${customer._id}/telegram-link`);
      const text = `سلام ${customer.name} عزیز، برای اینکه وقتی ماشین مدنظرت رسید خبرت کنیم این لینک را بزن: ${url}`;
      await navigator.clipboard?.writeText(text);
      setMsg('لینک کپی شد، برای مشتری بفرست');
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={go} className="rounded-lg border border-sky-300 px-2.5 py-1 text-xs font-bold text-sky-700">لینک تلگرام</button>
      {msg && <span className="text-xs">{msg}</span>}
    </span>
  );
}
