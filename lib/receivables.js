// Presentation only. Balances remain those calculated by loadOverview().
const idOf = (v) => String(v?._id || v || '');
const amount = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
export function normalizeSearch(v = '') {
  return String(v).replace(/[۰-۹]/g, n => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(n)))
    .replace(/[٠-٩]/g, n => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n)))
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
// [collections] collections: نقشه {carId: خروجی carCollection} — اختیاری
export function buildReceivableRows(receivables = [], contracts = [], cheques = [], collections = {}) {
  return receivables.filter(c => amount(c.remaining) > 0).map(c => {
    const id = idOf(c);
    const linked = contracts.filter(k => k.status === 'signed' && idOf(k.car) === id)
      .map(k => ({id: idOf(k), number: k.number || '', buyerName: k.buyer?.name || ''}));
    const pending = cheques.filter(q => idOf(q.car) === id && q.direction === 'received' && q.status === 'pending');
    const dates = pending.map(q => q.dueDate).filter(d => d && Number.isFinite(Date.parse(d)))
      .sort((a,b) => Date.parse(a) - Date.parse(b));
    return {
      _id: id, brand: c.brand || '', model: c.model || '', year: c.year || '',
      color: c.color || '', saleDate: c.saleDate || null,
      plate: c.plate ? { p1: c.plate.p1 || '', letter: c.plate.letter || '',
        p2: c.plate.p2 || '', region: c.plate.region || '' } : null,
      buyerName: c.buyerName || linked.find(k => k.buyerName)?.buyerName || '',
      salePrice: amount(c.salePrice), received: amount(c.received), remaining: amount(c.remaining),
      contracts: linked, pendingChequeCount: pending.length,
      pendingChequeAmount: pending.reduce((s,q) => s + Math.max(0,amount(q.amount)), 0),
      nextChequeDue: dates[0] || null,
      collection: pickCollection(collections[id]),
    };
  });
}
function pickCollection(c) {
  if (!c) return null;
  return {
    status: c.status, awaiting: c.awaiting, needsVerification: c.needsVerification, overdue: c.overdue,
    dueDate: c.dueDate || null, dueSource: c.dueSource || null, dueIn: c.dueIn ?? null,
    lastContactAt: c.lastContactAt || null, nextFollowUp: c.nextFollowUp || null, followDue: Boolean(c.followDue),
    verifiedIn: amount(c.verifiedIn), unverifiedIn: amount(c.unverifiedIn), claimedAmount: amount(c.claimedAmount),
    claimCount: (c.claims || []).length,
  };
}
export function filterRows(rows = [], query = '', mode = 'all') {
  const words = normalizeSearch(query).split(' ');
  return rows.filter(c => {
    if (mode === 'none' && c.received > 0) return false;
    if (mode === 'partial' && c.received <= 0) return false;
    if (mode === 'overdue' && !c.collection?.overdue && !c.collection?.followDue) return false;
    if (mode === 'verify' && !c.collection?.needsVerification) return false;
    const p = c.plate || {};
    const haystack = normalizeSearch([c.brand,c.model,c.year,c.color,c.buyerName,
      p.p1,p.letter,p.p2,p.region,(c.contracts || []).map(k => k.number).join(' ')].join(' '));
    return words.every(word => haystack.includes(word));
  });
}
