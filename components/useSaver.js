'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function useSaver() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    setErr('');
    try {
      const r = await fn();
      setOk(true);
      setTimeout(() => setOk(false), 1800);
      router.refresh();
      return r;
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, err, ok, run, router };
}
