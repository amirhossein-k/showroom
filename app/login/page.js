'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Icon from '@/components/Icon';
import { ErrorText } from '@/components/inputs';
export default function LoginPage() { const [pwd, setPwd] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const r = useRouter(); return <main className="grid min-h-screen place-items-center bg-asphalt-900 p-5"><div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"><div className="mb-7 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-road text-asphalt-950"><Icon name="car" size={27} /></span><div><div className="text-2xl font-black">اتودار</div><div className="text-sm text-ink-mute">ورود مدیریت نمایشگاه</div></div></div><form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/api/login', 'POST', { password: pwd }); r.push('/'); r.refresh(); } catch (e2) { setErr(e2.message); setBusy(false); } }}><label className="label">رمز ورود</label><input autoFocus type="password" className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} /><ErrorText error={err} /><button className="btn-primary mt-4 w-full" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود به پنل'}</button></form></div></main>; }
