// [settlement] تسویه هر خودرو با مالک امانی، شرکا و کمیسیون‌بگیرها
// بدون import تا در تست و کلاینت هم قابل استفاده باشد. ورودی fin همان خروجی carFinancials است.
//
// منطق نقدی (آبشار):
//   پول خریدار = سهم مالک امانی + کمیسیون‌ها + (آورده + سهم سود هر شریک) + (آورده + سهم سود نمایشگاه)
// سهم سود از «سود اسمی» حساب می‌شود، نه «سود واقعی»؛ چون هزینه خواب سرمایه یک هزینه فرصت است
// و پول نقدی نیست که از جایی خارج شود. اگر از سود واقعی تقسیم شود، جمع سهم‌ها با پول خریدار نمی‌خواند.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const idOf = (v) => String(v?._id || v || '');
const sumBy = (arr, f) => arr.reduce((a, x) => a + num(f(x)), 0);
export const normName = (v = '') =>
  String(v).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\s]+/g, ' ').trim().toLowerCase();

/**
 * @param car خودرو
 * @param fin خروجی carFinancials(car)
 * @param transactions تراکنش‌های همین خودرو
 * @param collection خروجی carCollection (اختیاری) برای «پول واقعاً وصول‌شده»
 */
export function carSettlement(car, fin, transactions = [], collection = null) {
  const id = idOf(car);
  const txs = transactions.filter((t) => idOf(t.car) === id);
  const outOf = (cat) => txs.filter((t) => t.direction === 'out' && t.category === cat);
  const price = num(fin.refPrice);
  const projected = !fin.sold;
  const nominal = fin.nominalProfit === null || fin.nominalProfit === undefined ? 0 : num(fin.nominalProfit);

  const parties = [];

  // ۱) مالک امانی
  if (fin.consign) {
    const due = num(car.ownerPrice);
    const paid = sumBy(outOf('purchase'), (t) => t.amount);
    parties.push({
      key: 'owner',
      kind: 'owner',
      name: car.consignor?.name || 'مالک امانی',
      phone: car.consignor?.phone || '',
      basis: 'مبلغ توافقی با مالک',
      due,
      paid,
      remaining: due - paid,
      payDefaults: { direction: 'out', category: 'purchase', party: car.consignor?.name || '' },
    });
  }

  // ۲) کمیسیون‌ها (وضعیت پرداخت همان تیک «پرداخت شد» در بخش کمیسیون است)
  (fin.commissions || []).forEach((c, i) => {
    const due = num(c.amount);
    if (!due) return;
    parties.push({
      key: `commission-${i}`,
      kind: 'commission',
      name: c.name || 'بدون نام',
      basis: `کمیسیون${c.role ? ' ' + c.role : ''}${c.mode === 'percent' ? ` (${c.value}٪)` : ''}`,
      due,
      paid: c.paid ? due : 0,
      remaining: c.paid ? 0 : due,
      payDefaults: { direction: 'out', category: 'commission', party: c.name || '' },
    });
  });

  // ۳) شرکا: آورده سرمایه + سهم از سود اسمی. پرداخت‌ها با «بابت شریک» و نام همان شریک تطبیق داده می‌شوند.
  const partnerTx = outOf('partner');
  const matched = new Set();
  const others = (fin.split || []).filter((p) => !p.own);
  for (const p of others) {
    const share = num(p.share);
    const profit = Math.round((nominal * share) / 100);
    const due = num(p.capital) + profit;
    const mine = partnerTx.filter((t) => normName(t.party) && normName(t.party) === normName(p.name));
    mine.forEach((t) => matched.add(idOf(t)));
    const paid = sumBy(mine, (t) => t.amount);
    parties.push({
      key: `partner-${idOf(p.partner) || p.name}`,
      kind: 'partner',
      name: p.name || 'شریک',
      basis: `${share}٪ · آورده ${num(p.capital).toLocaleString('en-US')} + سود ${profit.toLocaleString('en-US')}`,
      share,
      capital: num(p.capital),
      profit,
      due,
      paid,
      remaining: due - paid,
      payDefaults: { direction: 'out', category: 'partner', party: p.name || '' },
    });
  }
  const unmatchedPartnerTx = partnerTx.filter((t) => !matched.has(idOf(t)));

  // ۴) سهم نمایشگاه = هرچه بعد از دیگران می‌ماند (آورده خودش + سهم سودش؛ گردکردن هم اینجا جذب می‌شود)
  const othersDue = sumBy(parties, (p) => p.due);
  const own = (fin.split || []).find((p) => p.own) || { share: 100, capital: num(fin.capitalTied) };
  const showroomShare = price ? price - othersDue : 0;
  const showroomCapital = num(own.capital);

  const paidToOthers = sumBy(parties, (p) => Math.max(0, p.paid));
  const owedToOthers = sumBy(parties.filter((p) => p.remaining > 0), (p) => p.remaining);
  const overpaid = parties.filter((p) => p.remaining < 0);

  // پول نقد این پرونده بر اساس وصول تأییدشده (اگر collection داده شده) یا ثبت‌شده
  const collected = collection ? num(collection.verifiedIn) : sumBy(txs.filter((t) => t.direction === 'in' && t.category === 'sale'), (t) => t.amount);
  const recorded = collection ? num(collection.recordedIn) : collected;
  const cashLeft = collected - paidToOthers; // پول وصول‌شده‌ای که هنوز دست نمایشگاه است
  const payableNow = Math.max(0, Math.min(owedToOthers, cashLeft)); // با پول واقعاً رسیده چقدر می‌توان پرداخت کرد
  const showroomInHand = Math.max(0, cashLeft - owedToOthers); // سهم نمایشگاه که واقعاً در دست است

  const warnings = [];
  if (!price) warnings.push(projected ? 'قیمت آگهی ثبت نشده؛ پیش‌بینی تسویه ممکن نیست.' : 'قیمت فروش ثبت نشده است.');
  if (fin.sharesOverflow) warnings.push('جمع سهم شرکا بیشتر از ۱۰۰٪ است؛ اعداد تسویه قابل اتکا نیستند.');
  if (price && showroomShare < 0) warnings.push('بدهی به دیگران از مبلغ فروش بیشتر است؛ این معامله برای نمایشگاه زیان نقدی دارد.');
  if (paidToOthers > collected && !projected)
    warnings.push(collection
      ? 'بیش از پولی که با رسید بانکی تأیید شده، به دیگران پرداخت کرده‌ای.'
      : 'بیش از پول دریافت‌شده از خریدار به دیگران پرداخت کرده‌ای.');
  overpaid.forEach((p) => warnings.push(`به «${p.name}» بیش از سهمش پرداخت شده است.`));
  if (unmatchedPartnerTx.length)
    warnings.push(`${unmatchedPartnerTx.length} پرداخت «بابت شریک» با نام هیچ شریکی در این پرونده جور نیست؛ طرف حساب را اصلاح کن.`);
  if (nominal < 0 && others.length) warnings.push('معامله زیان اسمی دارد؛ زیان به نسبت سهم از آورده شرکا کم شده است.');

  return {
    projected,
    price,
    parties,
    othersDue,
    paidToOthers,
    owedToOthers,
    showroom: {
      share: showroomShare,
      capital: showroomCapital,
      profit: showroomShare - showroomCapital,
      percent: num(own.share),
    },
    collected,
    recorded,
    usesVerified: Boolean(collection),
    buyerRemaining: price - recorded,
    cashLeft,
    payableNow,
    showroomInHand,
    unmatchedPartnerTx,
    warnings,
    open: !projected && (owedToOthers > 0 || overpaid.length > 0),
  };
}
