import Link from 'next/link';
import { GUIDE_SECTIONS, MENU_ORDER, QUICK_START, GLOSSARY, CONTRACT_FORM_GUIDE } from '@/lib/guide';
import { GuideBody, ResetGuidesButton } from '@/components/PageGuide';

export const metadata = { title: 'راهنمای برنامه' };

const card = 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm';

export default function GuidePage() {
  // match (RegExp) قابل ارسال به کامپوننت کلاینت نیست؛ حذفش می‌کنیم
  const sections = MENU_ORDER.map((k) => GUIDE_SECTIONS.find((s) => s.key === k))
    .filter(Boolean)
    .map(({ match, ...rest }) => rest);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">راهنمای برنامه</h1>
          <p className="text-sm text-gray-600">هر بخش چه کاری می‌کند و از کجا شروع کنی.</p>
        </div>
        <ResetGuidesButton />
      </div>

      <section className={card}>
        <h2 className="mb-3 text-lg font-black">شروع سریع در ۶ قدم</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_START.map((q, i) => (
            <li key={q.title}>
              <Link href={q.href} className="block h-full rounded-xl border border-gray-100 p-3 hover:border-asphalt-900">
                <div className="font-black">
                  {(i + 1).toLocaleString('fa-IR')}. {q.title}
                </div>
                <div className="mt-1 text-sm leading-6 text-gray-600">{q.body}</div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <nav className={`${card} flex flex-wrap gap-2`}>
        {sections.map((s) => (
          <a key={s.key} href={`#${s.key}`} className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">
            {s.title}
          </a>
        ))}
        <a href="#contract-form" className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">فرم قولنامه</a>
        <a href="#glossary" className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">واژه‌نامه</a>
      </nav>

      {sections.map((s) => (
        <section key={s.key} id={s.key} className={`${card} scroll-mt-20`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-black">{s.title}</h2>
            {s.href && (
              <Link href={s.href} className="rounded-lg bg-asphalt-900 px-3 py-1.5 text-xs font-bold text-white">
                رفتن به این بخش
              </Link>
            )}
          </div>
          <GuideBody g={s} withForm={false} />
        </section>
      ))}

      <section id="contract-form" className={`${card} scroll-mt-20`}>
        <h2 className="mb-3 text-lg font-black">{CONTRACT_FORM_GUIDE.title}</h2>
        <GuideBody g={{ what: 'فرمی که در «قولنامه جدید»، «ساخت قولنامه از پرونده خودرو» و «ویرایش پیش‌نویس» می‌بینی.', features: CONTRACT_FORM_GUIDE.features, steps: CONTRACT_FORM_GUIDE.steps, tips: CONTRACT_FORM_GUIDE.tips }} withForm={false} />
      </section>

      <section id="glossary" className={`${card} scroll-mt-20`}>
        <h2 className="mb-3 text-lg font-black">واژه‌نامه</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map(([t, d]) => (
            <div key={t} className="rounded-xl bg-gray-50 p-3">
              <dt className="font-black">{t}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-600">{d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
