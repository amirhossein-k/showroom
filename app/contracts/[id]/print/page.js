import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Contract } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { formatDate, formatNumber, priceWords, toFa } from '@/lib/persian';
import { PAYMENT_KINDS } from '@/lib/contractDefaults';
import { bodySummary } from '@/lib/inspection';
import PrintButton from '@/components/PrintButton';
import { PartyIdentityPrint, ContractExtraPrint } from '@/components/ContractExtraPrint'; // [upgrade-v2]

export const dynamic = 'force-dynamic';

const plateText = (p) => (p ? toFa(`${p.p1 || ''} ${p.letter || ''} ${p.p2 || ''} - ایران ${p.region || ''}`) : '—');

function Party({ title, p }) {
  return (
    <div className="rounded-lg border border-gray-300 p-3">
      <div className="mb-1 font-black">{title}</div>
      <div>
        {p?.name || '—'} {p?.fatherName ? `فرزند ${p.fatherName}` : ''}
      </div>
      <div>کد ملی: {toFa(p?.nationalId || '—')} · تلفن: {toFa(p?.phone || '—')}</div>
      <PartyIdentityPrint p={p} />
      {p?.address && <div>نشانی: {p.address}</div>}
    </div>
  );
}

function SignBox({ title, name }) {
  return (
    <div className="flex h-28 flex-col justify-between rounded-lg border border-gray-300 p-2 text-center">
      <div className="font-bold">{title}</div>
      <div className="text-xs">{name || ''}</div>
      <div className="text-[10px] text-gray-500">امضا و اثر انگشت</div>
    </div>
  );
}

export default async function ContractPrintPage({ params }) {
  await connectDB();
  const [raw, settings] = await Promise.all([Contract.findById(params.id).populate('car').lean(), getSettings()]);
  if (!raw) notFound();
  const c = plain(raw);
  const car = c.car || {};
  const w = c.witnesses || [];
  const watermark = c.status === 'draft' ? 'پیش‌نویس — فاقد اعتبار' : c.status === 'cancelled' ? 'باطل شد' : '';

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #contract, #contract * { visibility: visible !important; }
          #contract { position: absolute; inset: 0; padding: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
          tr, .avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center gap-3">
        <Link href={`/contracts/${c._id}`} className="text-sm text-ink-soft">← مدیریت قرارداد</Link>
        <PrintButton />
        {watermark && <span className="rounded-lg bg-amberx-soft px-3 py-1 text-sm">⚠️ این قرارداد {c.status === 'draft' ? 'هنوز امضا نشده' : 'لغو شده'} است.</span>}
      </div>

      <article id="contract" className="relative mx-auto max-w-[210mm] bg-white p-6 text-[13px] leading-7 text-black">
        {watermark && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-30 select-none text-6xl font-black text-gray-300 opacity-50" style={{ transform: 'rotate(-30deg)' }}>{watermark}</span>
          </div>
        )}

        <header className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <div className="text-lg font-black">{settings.showroomName}</div>
            {settings.showroomAddress && <div className="text-xs">{settings.showroomAddress}</div>}
            {settings.showroomPhone && <div className="text-xs">تلفن: {toFa(settings.showroomPhone)}</div>}
          </div>
          <div className="text-center">
            <div className="text-xl font-black">قولنامه خرید و فروش خودرو</div>
          </div>
          <div className="text-left text-xs">
            <div>شماره: {toFa(c.number)}</div>
            <div>تاریخ: {formatDate(c.date)}</div>
            {c.place && <div>محل تنظیم: {c.place}</div>}
          </div>
        </header>

        <h3 className="mt-4 font-black">ماده ۱ — طرفین قرارداد</h3>
        <div className="grid grid-cols-2 gap-3">
          <Party title="فروشنده" p={c.seller} />
          <Party title="خریدار" p={c.buyer} />
        </div>

        <h3 className="mt-4 font-black">ماده ۲ — موضوع قرارداد (مشخصات خودرو)</h3>
        <div className="grid grid-cols-2 gap-x-6 rounded-lg border border-gray-300 p-3">
          <div>نوع و مدل: {car.brand} {car.model} {car.trim || ''}</div>
          <div>سال ساخت: {toFa(car.year)}</div>
          <div>رنگ: {car.color || '—'}</div>
          <div>کارکرد: {formatNumber(car.mileage)} کیلومتر</div>
          <div>شماره شاسی (VIN): {car.vin || '—'}</div>
          <div>شماره موتور: {car.engineNo || '—'}</div>
          <div>شماره پلاک: {plateText(car.plate)}</div>
          <div>وضعیت بدنه: {bodySummary(car.inspection)}</div>
        </div>

        <h3 className="mt-4 font-black">ماده ۳ — ثمن معامله و نحوه پرداخت</h3>
        <p>
          مبلغ کل معامله <b>{formatNumber(c.totalPrice)} تومان</b> ({priceWords(c.totalPrice)}) است که به شرح زیر پرداخت می‌شود:
        </p>
        <table className="mt-1 w-full border-collapse text-xs">
          <thead>
            <tr>
              {['ردیف', 'نوع', 'مبلغ (تومان)', 'مبلغ به حروف', 'سررسید / تاریخ', 'بانک', 'شماره چک / صیادی'].map((h) => (
                <th key={h} className="border border-gray-400 bg-gray-100 p-1">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.payments.map((p, i) => (
              <tr key={i}>
                <td className="border border-gray-400 p-1 text-center">{toFa(i + 1)}</td>
                <td className="border border-gray-400 p-1">{PAYMENT_KINDS[p.kind]}</td>
                <td className="border border-gray-400 p-1">{formatNumber(p.amount)}</td>
                <td className="border border-gray-400 p-1">{priceWords(p.amount)}</td>
                <td className="border border-gray-400 p-1">{formatDate(p.dueDate)}</td>
                <td className="border border-gray-400 p-1">{p.bank || '—'}</td>
                <td className="border border-gray-400 p-1" dir="ltr">{toFa(p.number || '')}{p.sayadId ? ` / ${toFa(p.sayadId)}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mt-4 font-black">ماده ۴ — تعهدات و زمان‌بندی</h3>
        <ol className="list-decimal pr-5">
          <li>تاریخ تحویل خودرو به خریدار: <b>{formatDate(c.deliveryDate)}</b></li>
          <li>طرفین متعهدند در تاریخ <b>{formatDate(c.transferDate)}</b> جهت انتقال رسمی سند در دفترخانه/مرکز تعویض پلاک حاضر شوند.</li>
          {c.penaltyPerDay > 0 && (
            <li>
              در صورت تأخیر هر یک از طرفین، روزانه مبلغ <b>{formatNumber(c.penaltyPerDay)} تومان</b> ({priceWords(c.penaltyPerDay)}) به عنوان وجه التزام به طرف مقابل پرداخت می‌شود.
            </li>
          )}
        </ol>

        <h3 className="mt-4 font-black">ماده ۵ — شرایط و بندهای قرارداد</h3>
        <ol className="list-decimal pr-5">
          {(c.terms || []).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>

        <ContractExtraPrint c={c} />

        {w.length > 0 && (
          <>
            <h3 className="mt-4 font-black">شهود</h3>
            <div className="grid grid-cols-2 gap-x-6">
              {w.map((x, i) => (
                <div key={i}>
                  شاهد {toFa(i + 1)}: {x.name} {x.fatherName ? `فرزند ${x.fatherName}` : ''} {x.nationalId ? `· کد ملی ${toFa(x.nationalId)}` : ''}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="avoid-break mt-6 grid grid-cols-4 gap-3">
          <SignBox title="فروشنده" name={c.seller?.name} />
          <SignBox title="خریدار" name={c.buyer?.name} />
          <SignBox title="شاهد اول" name={w[0]?.name} />
          <SignBox title="شاهد دوم" name={w[1]?.name} />
        </div>
        <p className="mt-3 text-center text-[10px] text-gray-500">این قرارداد در دو نسخه با اعتبار یکسان تنظیم شده است · شماره {toFa(c.number)}</p>
      </article>
    </>
  );
}
