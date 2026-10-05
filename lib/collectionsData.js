// [collections] داده سمت سرور برای صفحه نقدینگی و داشبورد
import { connectDB, plain } from './db';
import { Transaction, Cheque, Contract } from './models';
import { carCollection, buildCollectionAlerts, collectionTotals, isOpenCollection } from './collections';
import { carSettlement } from './settlement';

const idOf = (v) => String(v?._id || v || '');
const groupBy = (arr, key) => {
  const m = {};
  for (const x of arr) (m[idOf(x[key])] ||= []).push(x);
  return m;
};

/**
 * @param o خروجی loadOverview (برای استفاده دوباره از خودروها و fin)
 */
export async function loadCollections(o, { now = new Date() } = {}) {
  await connectDB();
  const sold = o.cars.filter((c) => c.fin?.sold);
  const ids = sold.map((c) => c._id);
  const [txRaw, chequeRaw, contractRaw] = await Promise.all([
    ids.length ? Transaction.find({ car: { $in: ids } }).sort({ date: -1 }).lean() : [],
    Cheque.find(ids.length ? { $or: [{ car: { $in: ids } }, { status: 'pending' }] } : { status: 'pending' }).sort({ dueDate: 1 }).lean(),
    ids.length ? Contract.find({ car: { $in: ids }, status: 'signed' }).select('car number buyer.name status payments').lean() : [],
  ]);
  const transactions = plain(txRaw);
  const cheques = plain(chequeRaw);
  const contracts = plain(contractRaw);
  const txBy = groupBy(transactions, 'car');
  const chequeBy = groupBy(cheques, 'car');
  const contractBy = groupBy(contracts, 'car');

  const carsById = {};
  const rows = [];
  const settlements = [];
  for (const car of sold) {
    const id = idOf(car);
    carsById[id] = { brand: car.brand, model: car.model, year: car.year, buyerName: car.buyerName || '' };
    const row = carCollection(car, { transactions: txBy[id] || [], cheques: chequeBy[id] || [], contracts: contractBy[id] || [], now });
    if (isOpenCollection(row)) rows.push(row);
    const st = carSettlement(car, car.fin, txBy[id] || [], row);
    if (st.open)
      settlements.push({
        _id: id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        ownership: car.ownership,
        buyerName: car.buyerName || '',
        saleDate: car.saleDate || null,
        ...st,
      });
  }

  // اطلاعات نمایشی ردیف‌ها (برای پنل تطبیق بانکی)
  const view = rows.map((r) => ({ ...r, car: carsById[r._id] }));
  const pending = cheques.filter((q) => q.status === 'pending');
  const alerts = buildCollectionAlerts(rows, pending, { now, alertDays: o.settings?.chequeAlertDays ?? 3, cars: carsById });
  return {
    rows: view,
    byCar: Object.fromEntries(view.map((r) => [r._id, r])),
    alerts,
    totals: collectionTotals(rows),
    settlements: settlements.sort((a, b) => b.owedToOthers - a.owedToOthers),
    settlementTotals: {
      owed: settlements.reduce((a, s) => a + s.owedToOthers, 0),
      payableNow: settlements.reduce((a, s) => a + s.payableNow, 0),
    },
  };
}
