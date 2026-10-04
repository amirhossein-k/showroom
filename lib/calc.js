import { daysBetween } from './persian';
import { SOLD_STATUSES } from './constants';

const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

export function isSold(car) {
  return SOLD_STATUSES.includes(car.status) && Number(car.salePrice) > 0;
}

export function holdingDays(car) {
  const start = car.purchaseDate || car.createdAt;
  const end = isSold(car) && car.saleDate ? car.saleDate : new Date();
  return Math.max(0, daysBetween(start, end));
}

export function commissionAmount(c, refPrice) {
  return c.mode === 'percent' ? Math.round(((Number(refPrice) || 0) * (Number(c.value) || 0)) / 100) : Number(c.value) || 0;
}

/**
 * محاسبهٔ سود واقعی یک پرونده
 * - قیمت تمام‌شده = قیمت خرید (یا مبلغ توافقی با مالک امانی) + هزینه‌های جانبی
 * - سود اسمی = قیمت فروش − قیمت تمام‌شده − کمیسیون‌ها
 * - هزینهٔ خواب سرمایه = سرمایهٔ درگیر × نرخ ماهانه × (روز ماندگاری / ۳۰)
 * - سود واقعی = سود اسمی − هزینهٔ خواب سرمایه
 */
export function carFinancials(car, settings = {}) {
  const rate = (Number(settings.monthlyCapitalRate ?? 2.5) || 0) / 100;
  const consign = car.ownership === 'consignment';
  const expensesTotal = sum((car.expenses || []).map((e) => e.amount));
  const base = consign ? Number(car.ownerPrice) || 0 : Number(car.purchasePrice) || 0;
  const totalCost = base + expensesTotal;
  const capitalTied = consign ? expensesTotal : totalCost;
  const sold = isSold(car);
  const refPrice = sold ? Number(car.salePrice) : Number(car.askingPrice) || 0;
  const commissions = (car.commissions || []).map((c) => ({ ...c, amount: commissionAmount(c, refPrice) }));
  const commissionTotal = sum(commissions.map((c) => c.amount));
  const days = holdingDays(car);
  const capitalCost = Math.round(capitalTied * rate * (days / 30));
  const nominalProfit = refPrice ? refPrice - totalCost - commissionTotal : null;
  const realProfit = nominalProfit === null ? null : nominalProfit - capitalCost;
  const roi = realProfit !== null && capitalTied > 0 ? (realProfit / capitalTied) * 100 : null;

  const partners = (car.partners || []).filter((p) => Number(p.share) > 0);
  const partnersShare = sum(partners.map((p) => p.share));
  const split = partners.map((p) => ({
    name: p.name,
    partner: p.partner,
    share: Number(p.share),
    capital: Math.round((capitalTied * p.share) / 100),
    profit: realProfit === null ? null : Math.round((realProfit * p.share) / 100),
  }));
  const ownShare = Math.max(0, 100 - partnersShare);
  split.unshift({
    name: 'نمایشگاه',
    own: true,
    share: ownShare,
    capital: Math.round((capitalTied * ownShare) / 100),
    profit: realProfit === null ? null : Math.round((realProfit * ownShare) / 100),
  });

  return {
    consign,
    sold,
    projected: !sold,
    base,
    expensesTotal,
    totalCost,
    capitalTied,
    refPrice,
    commissions,
    commissionTotal,
    days,
    rate: rate * 100,
    capitalCost,
    nominalProfit,
    realProfit,
    roi,
    split,
    sharesOverflow: partnersShare > 100,
  };
}
