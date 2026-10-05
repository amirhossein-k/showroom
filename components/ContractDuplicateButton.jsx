'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/** «قرارداد جدید از روی این»: مخصوصاً بعد از لغو، برای ثبت مجدد با اصلاحات */
export default function ContractDuplicateButton({ id, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (status === 'signed' && !confirm('این قرارداد امضاشده است. پیش‌نویس جدید فقط بعد از لغو این قرارداد قابل امضاست. ادامه؟')) return;
    setBusy(true);
    try {
      const c = await api(`/api/contracts/${id}/duplicate`, 'POST');
      router.push(`/contracts/${c._id}/edit`);
    } catch (e) {
      alert(e.message);
      setBusy(false);
    }
  };
  return (
    <button onClick={go} disabled={busy} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-bold disabled:opacity-50">
      {busy ? '…' : 'کپی به پیش‌نویس جدید'}
    </button>
  );
}
