// انواع مدارک قرارداد + استعلام‌ها (قابل استفاده در سرور و کلاینت)
export const DOC_TYPES = {
  contract_scan: { label: 'اسکن قولنامه امضاشده', required: true },
  buyer_id: { label: 'کارت ملی خریدار', required: true },
  seller_id: { label: 'کارت ملی فروشنده', required: true },
  car_card: { label: 'کارت خودرو', required: true },
  buyer_birth_cert: { label: 'شناسنامه خریدار' },
  seller_birth_cert: { label: 'شناسنامه فروشنده' },
  green_sheet: { label: 'برگ سبز / سند' },
  insurance: { label: 'بیمه‌نامه شخص ثالث' },
  fines_receipt: { label: 'رسید استعلام/پرداخت خلافی' },
  cheque_image: { label: 'تصویر چک' },
  other: { label: 'سایر' },
};
export const REQUIRED_DOCS = Object.keys(DOC_TYPES).filter((k) => DOC_TYPES[k].required);

export const DOC_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
export const DOC_MAX = 4 * 1024 * 1024; // محدودیت بدنه درخواست Vercel

export const INQUIRY_KINDS = {
  fines: 'استعلام خلافی',
  seizure: 'استعلام توقیف',
};

export function missingDocs(contract) {
  const have = new Set((contract?.documents || []).map((d) => d.type));
  return REQUIRED_DOCS.filter((k) => !have.has(k));
}

export function lastInquiry(contract, kind) {
  return [...(contract?.inquiries || [])].filter((q) => q.kind === kind).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
}
