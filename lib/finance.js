// گزارش مالی واقعی: سود هر خودرو بعد از هزینه‌ها، کمیسیون و سهم شرکا + تفکیک ماهانه (شمسی)
import { connectDB, plain } from './db';
import { Car, Contract } from './models';
import { getSettings } from './settings';
import { carFinancials } from './calc';
import { toJalali, JALALI_MONTHS } from './jalali';
import { SOLD_STATUSES, OWNERSHIP } from './constants';
import { contractSummary } from './contractDefaults';

const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const monthKey = (d) => {
  const { jy, jm } = toJalali(d);
  return { key: `${jy}-${String(jm).padStart(2, '0')}`, label: `${JALALI_MONTHS[jm - 1]} ${jy}` };
};

export async function buildFinanceReport(period) {
  await connectDB();
  const settings = await getSettings();
  const cars = plain(
    await Car.find({ status: { $in: SOLD_STATUSES }, saleDate: { $gte: period.from, $lte: period.to } })
      .sort({ saleDate: 1 })
      .lean()
  );
  const contracts = plain(await Contract.find({ car: { $in: cars.map((c) => c._id) }, status: 'signed' }).select('car number payments totalPrice status').lean());
  const byCar = Object.fromEntries(contracts.map((k) => [String(k.car), k]));

  const rows = cars.map((car) => {
    const f = carFinancials(car, settings);
    const k = byCar[String(car._id)];
    const s = k ? contractSummary(k) : null;
    const showroom = f.split.find((x) => x.own);
    const partners = f.split.filter((x) => !x.own);
    return {
      id: car._id,
      title: `${car.brand} ${car.model} ${car.year || ''}`.trim(),
      ownership: OWNERSHIP[car.ownership] || car.ownership,
      saleDate: car.saleDate,
      month: monthKey(car.saleDate),
      contractNo: k?.number || '',
      buyer: car.buyerName || '',
      salePrice: Number(car.salePrice) || 0,
      base: f.base,
      expenses: f.expensesTotal,
      totalCost: f.totalCost,
      commission: f.commissionTotal,
      commissions: f.commissions.map((c) => ({ name: c.name, role: c.role, amount: c.amount, paid: !!c.paid })),
      days: f.days,
      capitalCost: f.capitalCost,
      nominalProfit: f.nominalProfit ?? 0,
      realProfit: f.realProfit ?? 0,
      roi: f.roi,
      partnersProfit: sum(partners, (p) => p.profit),
      showroomProfit: showroom?.profit ?? 0,
      partners: partners.map((p) => ({ name: p.name, share: p.share, capital: p.capital, profit: p.profit })),
      collected: s ? s.paid : null,
      receivable: s ? s.remaining : null,
      sharesOverflow: f.sharesOverflow,
    };
  });

  // ماهانه
  const months = {};
  for (const r of rows) {
    const m = (months[r.month.key] ||= { key: r.month.key, label: r.month.label, count: 0, sales: 0, cost: 0, expenses: 0, commission: 0, capitalCost: 0, nominal: 0, real: 0, partners: 0, showroom: 0, receivable: 0 });
    m.count += 1;
    m.sales += r.salePrice;
    m.cost += r.base;
    m.expenses += r.expenses;
    m.commission += r.commission;
    m.capitalCost += r.capitalCost;
    m.nominal += r.nominalProfit;
    m.real += r.realProfit;
    m.partners += r.partnersProfit;
    m.showroom += r.showroomProfit;
    m.receivable += r.receivable || 0;
  }

  // شرکا
  const partnerMap = {};
  for (const r of rows)
    for (const p of r.partners) {
      const x = (partnerMap[p.name] ||= { name: p.name, cars: 0, capital: 0, profit: 0 });
      x.cars += 1;
      x.capital += p.capital || 0;
      x.profit += p.profit || 0;
    }

  // کمیسیون‌ها
  const commissions = rows.flatMap((r) => r.commissions.map((c) => ({ ...c, car: r.title, contractNo: r.contractNo, saleDate: r.saleDate })));

  const totals = {
    count: rows.length,
    sales: sum(rows, (r) => r.salePrice),
    totalCost: sum(rows, (r) => r.totalCost),
    expenses: sum(rows, (r) => r.expenses),
    commission: sum(rows, (r) => r.commission),
    capitalCost: sum(rows, (r) => r.capitalCost),
    nominal: sum(rows, (r) => r.nominalProfit),
    real: sum(rows, (r) => r.realProfit),
    partners: sum(rows, (r) => r.partnersProfit),
    showroom: sum(rows, (r) => r.showroomProfit),
    receivable: sum(rows, (r) => r.receivable || 0),
    unpaidCommission: sum(commissions.filter((c) => !c.paid), (c) => c.amount),
  };

  return {
    period: { key: period.key, label: period.label, from: period.from, to: period.to },
    rows,
    months: Object.values(months).sort((a, b) => a.key.localeCompare(b.key)),
    partners: Object.values(partnerMap).sort((a, b) => b.profit - a.profit),
    commissions,
    totals,
    warnings: rows.filter((r) => r.sharesOverflow).map((r) => `${r.title}: جمع سهم شرکا بیشتر از ۱۰۰٪ است`),
  };
}

/** خروجی اکسل (xlsx) راست‌به‌چپ — نیازمند پکیج exceljs */
export async function financeToXlsx(report) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Showroom';
  wb.created = new Date();
  const jdate = (d) => {
    if (!d) return '';
    const { jy, jm, jd } = toJalali(d);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  };
  const money = '#,##0';

  const sheet = (name, columns, data, totalRow) => {
    const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map((c) => ({ header: c.h, key: c.k, width: c.w || 16, style: c.money ? { numFmt: money } : {} }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    data.forEach((r) => ws.addRow(r));
    if (totalRow) {
      const row = ws.addRow(totalRow);
      row.font = { bold: true };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    return ws;
  };

  const t = report.totals;
  sheet(
    'سود هر خودرو',
    [
      { h: 'خودرو', k: 'title', w: 24 },
      { h: 'مالکیت', k: 'ownership', w: 10 },
      { h: 'تاریخ فروش', k: 'date', w: 12 },
      { h: 'شماره قولنامه', k: 'contractNo', w: 14 },
      { h: 'خریدار', k: 'buyer', w: 18 },
      { h: 'قیمت فروش', k: 'salePrice', money: true },
      { h: 'قیمت خرید / سهم مالک', k: 'base', money: true },
      { h: 'هزینه‌های جانبی', k: 'expenses', money: true },
      { h: 'کمیسیون', k: 'commission', money: true },
      { h: 'سود اسمی', k: 'nominalProfit', money: true },
      { h: 'روز خواب', k: 'days', w: 9 },
      { h: 'هزینه خواب سرمایه', k: 'capitalCost', money: true },
      { h: 'سود واقعی', k: 'realProfit', money: true },
      { h: 'سهم شرکا', k: 'partnersProfit', money: true },
      { h: 'سهم نمایشگاه', k: 'showroomProfit', money: true },
      { h: 'وصول‌شده', k: 'collected', money: true },
      { h: 'مانده مطالبات', k: 'receivable', money: true },
      { h: 'بازده (٪)', k: 'roi', w: 9 },
    ],
    report.rows.map((r) => ({ ...r, date: jdate(r.saleDate), roi: r.roi == null ? '' : Math.round(r.roi * 10) / 10 })),
    { title: `جمع (${t.count} خودرو)`, salePrice: t.sales, expenses: t.expenses, commission: t.commission, nominalProfit: t.nominal, capitalCost: t.capitalCost, realProfit: t.real, partnersProfit: t.partners, showroomProfit: t.showroom, receivable: t.receivable }
  );

  sheet(
    'گزارش ماهانه',
    [
      { h: 'ماه', k: 'label', w: 16 },
      { h: 'تعداد فروش', k: 'count', w: 10 },
      { h: 'جمع فروش', k: 'sales', money: true },
      { h: 'بهای خرید', k: 'cost', money: true },
      { h: 'هزینه‌ها', k: 'expenses', money: true },
      { h: 'کمیسیون', k: 'commission', money: true },
      { h: 'سود اسمی', k: 'nominal', money: true },
      { h: 'هزینه خواب سرمایه', k: 'capitalCost', money: true },
      { h: 'سود واقعی', k: 'real', money: true },
      { h: 'سهم شرکا', k: 'partners', money: true },
      { h: 'سهم نمایشگاه', k: 'showroom', money: true },
      { h: 'مانده مطالبات', k: 'receivable', money: true },
    ],
    report.months,
    { label: 'جمع', count: t.count, sales: t.sales, expenses: t.expenses, commission: t.commission, nominal: t.nominal, capitalCost: t.capitalCost, real: t.real, partners: t.partners, showroom: t.showroom, receivable: t.receivable }
  );

  sheet(
    'سهم شرکا',
    [
      { h: 'شریک', k: 'name', w: 20 },
      { h: 'تعداد خودرو', k: 'cars', w: 10 },
      { h: 'سرمایه درگیر', k: 'capital', money: true },
      { h: 'سهم سود', k: 'profit', money: true },
    ],
    [...report.partners, { name: 'نمایشگاه', cars: t.count, capital: '', profit: t.showroom }]
  );

  sheet(
    'کمیسیون‌ها',
    [
      { h: 'خودرو', k: 'car', w: 24 },
      { h: 'شماره قولنامه', k: 'contractNo', w: 14 },
      { h: 'تاریخ فروش', k: 'date', w: 12 },
      { h: 'نام', k: 'name', w: 16 },
      { h: 'نقش', k: 'role', w: 12 },
      { h: 'مبلغ', k: 'amount', money: true },
      { h: 'پرداخت شده؟', k: 'paidLabel', w: 12 },
    ],
    report.commissions.map((c) => ({ ...c, date: jdate(c.saleDate), paidLabel: c.paid ? 'بله' : 'خیر' })),
    { car: 'پرداخت‌نشده', amount: t.unpaidCommission }
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}
