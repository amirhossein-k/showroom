'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';

const NAV = [
  { href: '/', label: 'داشبورد امروز', icon: 'dashboard' },
  { href: '/cars', label: 'موجودی خودرو', icon: 'car' },
  { href: '/customers', label: 'مشتری و پیگیری', icon: 'users' },
  { href: '/cheques', label: 'چک‌ها', icon: 'cheque' },
  { href: '/cashflow', label: 'نقدینگی و تسویه', icon: 'cash' },
  { href: '/partners', label: 'شرکا', icon: 'partners' },
  { href: '/colleagues', label: 'شبکه همکاران', icon: 'network' },
  { href: '/market', label: 'قیمت بازار', icon: 'market' },
  { href: '/reports', label: 'گزارش سود', icon: 'report' },
  { href: '/settings', label: 'تنظیمات و تلگرام', icon: 'settings' },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-road text-asphalt-950">
        <Icon name="car" size={24} stroke={2.2} />
      </span>
      <span className="leading-tight">
        <span className="block text-xl font-black tracking-tight text-white">اتودار</span>
        <span className="block text-sm text-white/55">مدیریت نمایشگاه</span>
      </span>
    </Link>
  );
}

function NavList({ path, onNavigate }) {
  return (
    <nav className="mt-8 flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition ${
              active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
            }`}
          >
            {active && <span className="absolute -right-4 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l bg-road" />}
            <Icon name={n.icon} className={active ? 'text-road' : 'text-white/45 group-hover:text-white/80'} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Shell({ children }) {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  if (path.startsWith('/login')) return children;

  return (
    <div className="min-h-screen lg:pr-72">
      {/* سایدبار دسکتاپ */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 flex-col bg-asphalt-900 px-4 py-6 lg:flex">
        <div className="px-3">
          <Brand />
        </div>
        <NavList path={path} />
        <div className="lane-v absolute inset-y-0 left-0 w-1 animate-lanev opacity-70" />
        <div className="mt-auto px-3 text-sm text-white/40">نسخه ۱٫۰ · دادهٔ بازار آزمایشی</div>
      </aside>

      {/* نوار بالا موبایل */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-asphalt-900 px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white" aria-label="منو">
          <Icon name="menu" />
        </button>
      </header>
      <div className="lane h-1 lg:hidden" />

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog">
          <div className="absolute inset-0 bg-asphalt-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-xs animate-rise flex-col overflow-y-auto bg-asphalt-900 px-4 py-5">
            <div className="flex items-center justify-between px-3">
              <Brand />
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-white/70" aria-label="بستن">
                <Icon name="close" />
              </button>
            </div>
            <NavList path={path} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pt-8">{children}</main>
    </div>
  );
}
