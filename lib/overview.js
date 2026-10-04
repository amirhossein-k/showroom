import { connectDB, plain } from './db';
import { Car, Cheque, Customer, Transaction } from './models';
import { getSettings } from './settings';
import { carFinancials, isSold } from './calc';
import { marketAnalysis, ownDealsFor, loadMarket } from './market';
import { ACTIVE_STATUSES, OPEN_LEAD, ALL_DOC_KEYS } from './constants';
import { addDays, endOfDay, daysBetween } from './persian';
import { toJalali, jalaliToDate } from './jalali';
import { getPeriod } from './period';

export function jalaliMonthStart(d = new Date()) {
  const { jy, jm } = toJalali(d);
  const s = jalaliToDate(jy, jm, 1);
  s.setHours(0, 0, 0, 0);
  return s;
}

/** همهٔ داده‌های لازم برای داشبورد مدیر و پیام تلگرام */
export async function loadOverview(periodKey = 'month') {
  await connectDB();
  const settings = await getSettings();
  const now = new Date();
  const [carsRaw, chequesRaw, customersRaw, saleTx] = await Promise.all([
    Car.find({}).sort({ createdAt: -1 }).lean(),
    Cheque.find({ status: 'pending' }).populate('car', 'brand model year').sort({ dueDate: 1 }).lean(),
    Customer.find({ status: { $in: OPEN_LEAD } }).populate('interestedCars', 'brand model year').lean(),
    Transaction.find({ category: 'sale', direction: 'in' }).lean(),
  ]);
  const cars = plain(carsRaw);
  const market = loadMarket();
  const soldCars = cars.filter(isSold);

  const enriched = cars.map((c) => {
    const fin = carFinancials(c, settings);
    const mk = ACTIVE_STATUSES.includes(c.status) ? marketAnalysis(c, { ownDeals: ownDealsFor(c, soldCars), settings, market }) : null;
    return { ...c, fin, mk };
  });
  const active = enriched.filter((c) => ACTIVE_STATUSES.includes(c.status));

  // چک‌ها: ۷ روز آینده + سررسیدگذشته‌های پاس‌نشده
  const weekEnd = endOfDay(addDays(now, 7));
  const cheques = plain(chequesRaw)
    .filter((q) => new Date(q.dueDate) <= weekEnd)
    .map((q) => {
      const daysLeft = daysBetween(now, q.dueDate);
      const level = daysLeft < 0 ? 'overdue' : daysLeft <= settings.chequeAlertDays ? 'near' : 'normal';
      return { ...q, daysLeft, level };
    });

  const dormant = active.filter((c) => c.fin.days >= settings.dormantDays).sort((a, b) => b.fin.days - a.fin.days);
  const overpriced = active.filter((c) => c.mk?.flag === 'over').sort((a, b) => b.mk.diffPct - a.mk.diffPct);

  const customers = plain(customersRaw);
  const todayEnd = endOfDay(now);
  const followToday = customers
    .filter((c) => c.nextFollowUp && new Date(c.nextFollowUp) <= todayEnd)
    .sort((a, b) => new Date(a.nextFollowUp) - new Date(b.nextFollowUp));
  const followIds = new Set(followToday.map((c) => c._id));
  const cooling = customers
    .filter((c) => !followIds.has(c._id))
    .filter((c) => !c.nextFollowUp || new Date(c.nextFollowUp) < now)
    .map((c) => ({ ...c, silentDays: daysBetween(c.lastContact || c.createdAt, now) }))
    .filter((c) => c.silentDays >= settings.coolingDays)
    .sort((a, b) => b.silentDays - a.silentDays);

  const receivedByCar = {};
  for (const t of plain(saleTx)) if (t.car) receivedByCar[t.car] = (receivedByCar[t.car] || 0) + t.amount;
  const receivables = enriched
    .filter((c) => c.fin.sold)
    .map((c) => ({ ...c, received: receivedByCar[c._id] || 0, remaining: c.salePrice - (receivedByCar[c._id] || 0) }))
    .filter((c) => c.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const transferPending = enriched
    .filter((c) => c.status === 'awaiting_transfer')
    .map((c) => ({ ...c, missing: ALL_DOC_KEYS.filter((d) => !c.docs?.[d.key]).map((d) => d.label) }));

  // ارزش موجودی
  const costValue = active.reduce((a, c) => a + c.fin.totalCost, 0);
  const ownedActive = active.filter((c) => !c.fin.consign);
  const marketValue = ownedActive.reduce((a, c) => a + (c.mk?.available ? c.mk.suggested.target : c.fin.totalCost), 0);
  const ownedCost = ownedActive.reduce((a, c) => a + c.fin.totalCost, 0);
  const capitalBurnMonthly = Math.round(active.reduce((a, c) => a + c.fin.capitalTied, 0) * (settings.monthlyCapitalRate / 100));

  // سود ماه جاری (شمسی)
  const period = getPeriod(periodKey);
  const soldThisMonth = enriched.filter((c) => c.fin.sold && c.saleDate && new Date(c.saleDate) >= period.from && new Date(c.saleDate) <= period.to);
  const monthNominal = soldThisMonth.reduce((a, c) => a + (c.fin.nominalProfit || 0), 0);
  const monthReal = soldThisMonth.reduce((a, c) => a + (c.fin.realProfit || 0), 0);

  return {
    settings,
    now: now.toISOString(),
    cars: enriched,
    active,
    cheques,
    dormant,
    overpriced,
    followToday,
    cooling,
    receivables,
    transferPending,
    stats: {
      activeCount: active.length,
      ownedCount: ownedActive.length,
      consignCount: active.length - ownedActive.length,
      costValue,
      ownedCost,
      marketValue,
      capitalBurnMonthly,
      soldThisMonth: soldThisMonth.length,
      monthNominal,
      monthReal,
      periodKey,
      receivableTotal: receivables.reduce((a, c) => a + c.remaining, 0),
      chequeIn7: cheques.filter((q) => q.direction === 'received').reduce((a, q) => a + q.amount, 0),
      chequeOut7: cheques.filter((q) => q.direction === 'issued').reduce((a, q) => a + q.amount, 0),
    },
    marketUpdatedAt: market.updatedAt,
  };
}
