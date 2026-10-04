import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Contract } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { formatDate, formatNumber, priceWords, toFa } from '@/lib/persian';
import { PAYMENT_KINDS } from '@/lib/contractDefaults';
import { bodySummary } from '@/lib/inspection';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

const plateText = (p) => (p ? toFa(`${p.p1 || ''} ${p.letter || ''} ${p.p2 || ''} - ایران ${p.region || ''}`) : '—');

function Party({ title, p }) {
  return (
    <div className="rounded-lg border border-gray-300 p-3 text-sm leading-7">
      <div className="font-bold">{title}</div>
      <div>{p?.name || '—'} {p?.fatherName ? `فرزند ${p.fatherName}` : ''}</div>
      <div>کد ملی: {toFa(p?.nationalId || '—')} · تلفن: {toFa(p?.phone || '—')}</div>
      {p?.address && <div>نشانی: {p.address}</div>}
    </div>
  );
}

export default async function ContractPrintPage({ params }) {
  await connectDB();
  const [raw, settings] = await Promise.all([Contract.findById(params.id).populate('car').lean(), getSettings()]);
  if (!raw) notFound();
  const c = plain(raw);
  const car = c.car || {};

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #contract, #contract * { visibility: visible !important; }
          #contract { position: absolute; inset: 0; padding: 12mm; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
      <div className="no-print mb-4 flex items-center gap-3">
        <Link href={`/cars/${car._id}`} className="text-sm text-ink-soft">← پرونده خودرو</Link>
        <PrintButton />
      </div>

      <article id="contract" dir="rtl" className="mx-auto max-w-3xl space-y-4 bg-white p-6 text-[13px] leading-7 text-black">
        <header className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <div className="text-lg font-black">{settings.showroomName}</div>
            {settings.showroomAddress && <div>{settings.showroomAddress}</div>}
            {settings.showroomPhone && <div>تلفن: {toFa(settings.showroomPhone)}</div>}
          </div>
          <div className="text-left">
            <div className="text-xl font-black">قولنامه خرید و فروش خودرو</div>
            <div>شماره: {toFa(c.number)}</div>
            <div>تاریخ: {formatDate(c.date)}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <Party title="فروشنده" p={c.seller} />
          <Party title="خریدار" p={c.buyer} />
        </section>

        <section className="rounded-lg border border-gray-300 p-3">
          <div className="mb-1 font-bold">مشخصات خودرو</div>
          <div className="grid grid-cols-2 gap-x-6">
            <div>نوع و مدل: {car.brand} {car.model} {car.trim || ''}</div>
            <div>سال ساخت: {toFa(car.year)}</div>
            <div>رنگ: {car.color || '—'}</div>
            <div>کارکرد: {formatNumber(car.mileage)} کیلومتر</div>
            <div>شماره شاسی (VIN): {car.vin || '—'}</div>
            <div>شماره موتور: {car.engineNo || '—'}</div>
            <div>شماره پلاک: {plateText(car.plate)}</div>
            <div>وضعیت بدنه: {bodySummary(car.inspection)}</div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-300 p-3">
          <div className="font-bold">ثمن معامله</div>
          <div>
            مبلغ کل: <b>{formatNumber(c.totalPrice)} تومان</b> ({priceWords(c.totalPrice)}) که به شرح زیر پرداخت می‌شود:
          </div>
          <table className="mt-2 w-full border-collapse text-center">
            <thead>
              <tr className="bg-gray-100">
                {['ردیف', 'نوع', 'مبلغ (تومان)', 'سررسید / تاریخ', 'بانک', 'شماره چک / صیادی'].map((h) => (
                  <th key={h} className="border border-gray-300 px-2 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.payments.map((p, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2">{toFa(i + 1)}</td>
                  <td className="border border-gray-300 px-2">{PAYMENT_KINDS[p.kind]}</td>
                  <td className="border border-gray-300 px-2">{formatNumber(p.amount)}</td>
                  <td className="border border-gray-300 px-2">{formatDate(p.dueDate)}</td>
                  <td className="border border-gray-300 px-2">{p.bank || '—'}</td>
                  <td className="border border-gray-300 px-2">{toFa(p.number || '')}{p.sayadId ? ` / ${toFa(p.sayadId)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-gray-300 p-3">
          <div className="font-bold">تعهدات</div>
          <div>تاریخ تحویل خودرو: {formatDate(c.deliveryDate)} · تاریخ انتقال سند: {formatDate(c.transferDate)}</div>
          {c.penaltyPerDay > 0 && <div>وجه التزام تأخیر: روزانه {formatNumber(c.penaltyPerDay)} تومان ({priceWords(c.penaltyPerDay)})</div>}
          <ol className="mt-2 list-decimal space-y-1 pr-5">
            {(c.terms || []).map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        </section>

        <footer className="grid grid-cols-4 gap-4 pt-8 text-center">
          {['امضای فروشنده', 'امضای خریدار', 'شاهد اول', 'شاهد دوم'].map((s) => (
            <div key={s} className="border-t border-black pt-2">{s}</div>
          ))}
        </footer>
      </article>
    </>
  );
}
