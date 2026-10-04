import { connectDB, plain } from '@/lib/db';
import { Car } from '@/lib/models';
import { getSettings } from '@/lib/settings';
import { carFinancials } from '@/lib/calc';
import { getPeriod } from '@/lib/period';
import { toJalali } from '@/lib/jalali';
import { SOLD_STATUSES, OWNERSHIP } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const jdate = (d) => {
  if (!d) return '';
  const { jy, jm, jd } = toJalali(d);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
};

// خروجی CSV فروش‌ها برای ورود به نرم‌افزار حسابداری / سامانه مودیان
// توجه: قالب نهایی را با ارائه‌دهندهٔ خدمات مالیاتی (شرکت معتمد) خود تطبیق دهید.
export async function GET(req) {
  await connectDB();
  const settings = await getSettings();
  const period = getPeriod(req.nextUrl.searchParams.get('period') || 'month');
  const cars = plain(
    await Car.find({ status: { $in: SOLD_STATUSES }, saleDate: { $gte: period.from, $lte: period.to } })
      .populate('buyer', 'name nationalId phone address')
      .sort({ saleDate: 1 })
      .lean()
  );
  const header = ['ردیف', 'شماره فاکتور', 'تاریخ صدور', 'نام خریدار', 'کد/شناسه ملی خریدار', 'تلفن خریدار', 'آدرس خریدار', 'شرح کالا', 'شماره شاسی (VIN)', 'شماره موتور', 'پلاک', 'نوع مالکیت', 'مبلغ فروش (ریال)', 'بهای تمام‌شده (ریال)', 'حاشیه سود (ریال)', 'نرخ ارزش افزوده', 'ارزش افزوده بر حاشیه (ریال)', 'شناسه ملی فروشنده', 'کد اقتصادی فروشنده'];
  const rows = cars.map((c, i) => {
    const fin = carFinancials(c, settings);
    const margin = Math.max(0, (c.salePrice - fin.totalCost) * 10);
    const vat = Math.round((margin * (settings.vatRate || 0)) / 100);
    const { jy } = toJalali(c.saleDate);
    const p = c.plate || {};
    return [
      i + 1,
      `${jy}-${String(i + 1).padStart(4, '0')}`,
      jdate(c.saleDate),
      c.buyer?.name || c.buyerName || '',
      c.buyer?.nationalId || '',
      c.buyer?.phone || '',
      c.buyer?.address || '',
      `خودرو ${c.brand} ${c.model} ${c.trim || ''} مدل ${c.year || ''} رنگ ${c.color || ''}`.replace(/\s+/g, ' ').trim(),
      c.vin || '',
      c.engineNo || '',
      p.p1 ? `${p.p1} ${p.letter} ${p.p2} - ${p.region}` : '',
      OWNERSHIP[c.ownership],
      (c.salePrice || 0) * 10,
      fin.totalCost * 10,
      margin,
      `${settings.vatRate || 0}%`,
      vat,
      settings.nationalId || '',
      settings.economicCode || '',
    ];
  });
  const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoices-${period.key}.csv"`,
    },
  });
}
