// [collections] پیگیری وصول هر خودرو + هشدار سررسیدها + تطبیق با رسید بانکی
// این فایل عمداً هیچ import ندارد تا هم در سرور، هم در کلاینت و هم در تست‌ها قابل استفاده باشد.
// مانده «ثبت‌شده» دقیقاً با loadOverview یکی است (قیمت فروش − دریافت‌های بابت فروش).
// تفاوت: دریافت ثبت‌شده به دو بخش «تأییدشده با بانک» و «ثبت‌شده ولی تأییدنشده» شکسته می‌شود.

const DAY = 86400000;
const idOf = (v) => String(v?._id || v || '');
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sumBy = (arr, f) => arr.reduce((a, x) => a + num(f(x)), 0);
const validDate = (d) => d && Number.isFinite(Date.parse(d));
const dayStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
/** روز تقویمی از امروز تا تاریخ؛ منفی یعنی گذشته */
export function daysUntil(d, now = new Date()) {
  if (!validDate(d)) return null;
  return Math.round((dayStart(d) - dayStart(now)) / DAY);
}
const earliest = (dates) => dates.filter(validDate).sort((a, b) => Date.parse(a) - Date.parse(b))[0] || null;

export const COLLECTION_STATUS = {
  awaiting: { label: 'منتظر پرداخت', cls: 'bg-amberx-soft text-amberx' },
  needs_verification: { label: 'پرداخت اعلام شده، نیازمند تأیید', cls: 'bg-plate-soft text-plate' },
  settled: { label: 'وصول کامل و تأییدشده', cls: 'bg-cash-soft text-cash' },
};

export const CONTACT_RESULTS = {
  promised: 'قول پرداخت داد',
  claimed_paid: 'گفت پرداخت کرده',
  no_answer: 'پاسخ نداد',
  refused: 'امتناع / اختلاف',
  other: 'سایر',
};
export const CONTACT_CHANNELS = { phone: 'تماس تلفنی', message: 'پیام', visit: 'حضوری' };

/**
 * وضعیت وصول یک خودروی فروخته‌شده
 * @param car خودرو (با receivable)
 * @param transactions همه تراکنش‌های همین خودرو
 * @param cheques همه چک‌های همین خودرو
 * @param contracts قولنامه‌های امضاشده همین خودرو
 */
export function carCollection(car, { transactions = [], cheques = [], contracts = [], now = new Date() } = {}) {
  const id = idOf(car);
  const rec = car.receivable || {};
  const mine = (x) => idOf(x.car) === id;
  const saleIn = transactions.filter((t) => mine(t) && t.direction === 'in' && t.category === 'sale');
  const verifiedTx = saleIn.filter((t) => t.verified);
  const unverifiedTx = saleIn.filter((t) => !t.verified);
  const salePrice = num(car.salePrice);
  const recordedIn = sumBy(saleIn, (t) => t.amount);
  const verifiedIn = sumBy(verifiedTx, (t) => t.amount);

  const claims = (rec.claims || []).filter((c) => c.status === 'claimed');
  const claimedAmount = sumBy(claims, (c) => c.amount);

  const carCheques = cheques.filter((q) => mine(q) && q.direction === 'received');
  const pendingCheques = carCheques.filter((q) => q.status === 'pending');
  const linkedChequeIds = new Set(transactions.filter((t) => t.cheque).map((t) => idOf(t.cheque)));
  const clearedUnrecorded = carCheques.filter((q) => q.status === 'cleared' && !linkedChequeIds.has(idOf(q)));
  const bouncedCheques = carCheques.filter((q) => q.status === 'bounced');

  // اقساط غیرچکی قولنامه که هنوز پرداخت نشده‌اند (چک‌ها جداگانه از دفتر چک می‌آیند)
  const signed = contracts.filter((k) => idOf(k.car) === id && k.status === 'signed');
  const contractPending = signed.flatMap((k) =>
    (k.payments || [])
      .filter((p) => p.kind !== 'cheque' && (p.status || (p.paid ? 'paid' : 'pending')) === 'pending')
      .map((p) => ({ _id: idOf(p), contract: idOf(k), contractNumber: k.number || '', kind: p.kind, amount: num(p.amount), dueDate: p.dueDate || null }))
  );

  const remaining = salePrice - recordedIn; // همان منطق داشبورد
  const unverifiedRemaining = salePrice - verifiedIn; // هنوز واقعاً به حساب ننشسته
  const manualDue = validDate(rec.dueDate) ? rec.dueDate : null;
  const contractDue = earliest(contractPending.map((p) => p.dueDate));
  const dueDate = manualDue || contractDue;
  const dueIn = remaining > 0 ? daysUntil(dueDate, now) : null;
  const followIn = daysUntil(rec.nextFollowUp, now);
  const unverifiedIn = recordedIn - verifiedIn;

  const needsVerification = claims.length > 0 || unverifiedIn > 0 || clearedUnrecorded.length > 0;
  const awaiting = remaining > 0;
  const status = needsVerification ? 'needs_verification' : awaiting ? 'awaiting' : 'settled';
  const log = (rec.log || []).slice().sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));

  return {
    _id: id,
    salePrice,
    recordedIn,
    verifiedIn,
    unverifiedIn,
    remaining,
    unverifiedRemaining,
    claimedAmount,
    claims,
    unverifiedTx,
    verifiedTx,
    pendingCheques,
    pendingChequeAmount: sumBy(pendingCheques, (q) => q.amount),
    nextChequeDue: earliest(pendingCheques.map((q) => q.dueDate)),
    clearedUnrecorded,
    bouncedCheques,
    contractPending,
    hasContract: signed.length > 0,
    dueDate,
    dueSource: manualDue ? 'manual' : contractDue ? 'contract' : null,
    dueIn,
    overdue: awaiting && dueIn !== null && dueIn < 0,
    lastContactAt: rec.lastContactAt || log[0]?.at || null,
    lastContact: log[0] || null,
    nextFollowUp: rec.nextFollowUp || null,
    followIn,
    followDue: followIn !== null && followIn <= 0,
    awaiting,
    needsVerification,
    status,
  };
}

/** آیا این خودرو در فهرست پیگیری وصول جا دارد؟ */
export const isOpenCollection = (c) => c.awaiting || c.needsVerification;

const LEVEL_ORDER = { overdue: 0, near: 1, info: 2 };

/**
 * هشدار مطالبات سررسیدگذشته، پیگیری‌های امروز، اعلام‌های تأییدنشده و چک‌ها
 * @param rows خروجی carCollection برای خودروهای باز
 * @param cheques همه چک‌های «در جریان» (دریافتی و پرداختی)
 * @param cars برای نام خودرو: { [id]: {brand, model, year, buyerName} }
 */
export function buildCollectionAlerts(rows = [], cheques = [], { now = new Date(), alertDays = 3, cars = {} } = {}) {
  const alerts = [];
  const nameOf = (id) => {
    const c = cars[id] || {};
    return [c.brand, c.model, c.year].filter(Boolean).join(' ') || 'خودرو';
  };
  const buyerOf = (id) => cars[id]?.buyerName || '';
  const push = (a) => alerts.push(a);

  for (const r of rows) {
    const href = `/cars/${r._id}#collection`;
    const who = buyerOf(r._id);
    if (r.awaiting && r.dueIn !== null && r.dueIn < 0)
      push({ key: `due-${r._id}`, kind: 'receivable_overdue', level: 'overdue', days: r.dueIn, date: r.dueDate, amount: r.remaining, href,
        title: `مطالبه سررسیدگذشته · ${nameOf(r._id)}`, sub: `${who ? who + ' · ' : ''}${-r.dueIn} روز از سررسید گذشته` });
    else if (r.awaiting && r.dueIn !== null && r.dueIn <= alertDays)
      push({ key: `due-${r._id}`, kind: 'receivable_near', level: 'near', days: r.dueIn, date: r.dueDate, amount: r.remaining, href,
        title: `سررسید نزدیک مطالبه · ${nameOf(r._id)}`, sub: `${who ? who + ' · ' : ''}${r.dueIn === 0 ? 'امروز' : r.dueIn + ' روز دیگر'}` });
    else if (r.awaiting && r.dueIn === null)
      push({ key: `nodue-${r._id}`, kind: 'receivable_nodue', level: 'info', amount: r.remaining, href,
        title: `سررسید تعیین نشده · ${nameOf(r._id)}`, sub: 'برای مانده این خودرو تاریخ سررسید ثبت کن' });

    if (r.followDue && r.awaiting)
      push({ key: `follow-${r._id}`, kind: 'followup_due', level: r.followIn < 0 ? 'overdue' : 'near', days: r.followIn, date: r.nextFollowUp, amount: r.remaining, href,
        title: `پیگیری وصول · ${nameOf(r._id)}`, sub: `${who ? who + ' · ' : ''}${r.followIn === 0 ? 'امروز باید تماس بگیری' : -r.followIn + ' روز از موعد پیگیری گذشته'}` });

    if (r.claims.length)
      push({ key: `claim-${r._id}`, kind: 'claim_pending', level: 'near', amount: r.claimedAmount, href,
        title: `اعلام پرداخت، منتظر تطبیق با بانک · ${nameOf(r._id)}`, sub: `${r.claims.length} مورد اعلام‌شده؛ تا تأیید رسید بانکی وصول حساب نمی‌شود` });

    for (const q of r.clearedUnrecorded)
      push({ key: `cleared-${idOf(q)}`, kind: 'cheque_unrecorded', level: 'near', amount: num(q.amount), date: q.dueDate, href,
        title: `چک پاس‌شده بدون ثبت دریافت · ${nameOf(r._id)}`, sub: `چک ${q.number || ''} ${q.bank || ''}`.trim() + ' · در مانده لحاظ نشده' });

    for (const q of r.bouncedCheques)
      push({ key: `bounced-${idOf(q)}`, kind: 'cheque_bounced', level: 'overdue', amount: num(q.amount), date: q.dueDate, href,
        title: `چک برگشتی · ${nameOf(r._id)}`, sub: `${q.party || who || ''} · چک ${q.number || ''}`.trim() });
  }

  for (const q of cheques.filter((x) => x.status === 'pending')) {
    const d = daysUntil(q.dueDate, now);
    if (d === null || d > alertDays) continue;
    const received = q.direction === 'received';
    const carId = idOf(q.car);
    push({
      key: `cheque-${idOf(q)}`,
      kind: d < 0 ? 'cheque_overdue' : 'cheque_near',
      level: d < 0 ? 'overdue' : 'near',
      days: d,
      date: q.dueDate,
      amount: num(q.amount),
      href: carId && cars[carId] ? `/cars/${carId}#collection` : '/cheques',
      direction: q.direction,
      title: `${received ? 'چک دریافتی' : 'چک پرداختی'} ${d < 0 ? 'سررسیدگذشته' : 'نزدیک سررسید'} · ${q.party || 'بدون نام'}`,
      sub: d < 0
        ? `${-d} روز گذشته · ${received ? 'وصول یا برگشت آن را ثبت کن؛ تا آن موقع وصول‌شده نیست' : 'پاس شدن یا نشدن آن را ثبت کن'}`
        : `${d === 0 ? 'امروز' : d + ' روز دیگر'} · ${q.bank || 'بانک نامشخص'}`,
    });
  }

  return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || (a.days ?? 999) - (b.days ?? 999) || b.amount - a.amount);
}

/** جمع‌بندی برای کارت‌های بالای صفحه */
export function collectionTotals(rows = []) {
  return {
    salePrice: sumBy(rows, (r) => r.salePrice),
    verifiedIn: sumBy(rows, (r) => r.verifiedIn),
    unverifiedIn: sumBy(rows, (r) => r.unverifiedIn),
    claimed: sumBy(rows, (r) => r.claimedAmount),
    pendingCheques: sumBy(rows, (r) => r.pendingChequeAmount),
    remaining: sumBy(rows.filter((r) => r.remaining > 0), (r) => r.remaining),
    unverifiedRemaining: sumBy(rows.filter((r) => r.unverifiedRemaining > 0), (r) => r.unverifiedRemaining),
    overdueCount: rows.filter((r) => r.overdue).length,
    overdueAmount: sumBy(rows.filter((r) => r.overdue), (r) => r.remaining),
    needsVerificationCount: rows.filter((r) => r.needsVerification).length,
    awaitingCount: rows.filter((r) => r.awaiting).length,
  };
}
