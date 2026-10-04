export const CAR_STATUS = {
  available: { label: 'موجود', cls: 'bg-cash-soft text-cash' },
  negotiating: { label: 'در مذاکره', cls: 'bg-amberx-soft text-amberx' },
  reserved: { label: 'رزرو', cls: 'bg-plate-soft text-plate' },
  sold: { label: 'فروخته‌شده', cls: 'bg-asphalt-800 text-white' },
  awaiting_transfer: { label: 'منتظر انتقال سند', cls: 'bg-road-soft text-asphalt-900' },
};
export const ACTIVE_STATUSES = ['available', 'negotiating', 'reserved'];
export const SOLD_STATUSES = ['sold', 'awaiting_transfer'];

export const OWNERSHIP = {
  owned: 'ملکی',
  consignment: 'امانی',
};

export const EXPENSE_TYPES = {
  inspection: 'کارشناسی',
  transport: 'حمل',
  repair: 'تعمیر جزئی',
  brokerage: 'کمیسیون واسطه خرید',
  admin: 'هزینه اداری',
  wash: 'شست‌وشو و آماده‌سازی',
  other: 'سایر',
};

export const COMMISSION_ROLES = ['واسطه', 'فروشنده', 'کارشناس', 'معرف', 'شریک'];

export const LEAD_SOURCES = {
  divar: 'دیوار',
  instagram: 'اینستاگرام',
  walkin: 'حضوری',
  referral: 'معرفی',
  phone: 'تماس تلفنی',
  other: 'سایر',
};

export const LEAD_STATUS = {
  new: { label: 'جدید', cls: 'bg-plate-soft text-plate' },
  hot: { label: 'داغ', cls: 'bg-alarm-soft text-alarm' },
  warm: { label: 'گرم', cls: 'bg-amberx-soft text-amberx' },
  cold: { label: 'سرد', cls: 'bg-paper text-ink-soft' },
  won: { label: 'خرید کرد', cls: 'bg-cash-soft text-cash' },
  lost: { label: 'منصرف شد', cls: 'bg-paper text-ink-mute' },
};
export const OPEN_LEAD = ['new', 'hot', 'warm', 'cold'];

export const CHEQUE_STATUS = {
  pending: { label: 'در جریان', cls: 'bg-amberx-soft text-amberx' },
  cleared: { label: 'وصول/پاس شد', cls: 'bg-cash-soft text-cash' },
  bounced: { label: 'برگشت خورد', cls: 'bg-alarm text-white' },
  cancelled: { label: 'باطل/عودت', cls: 'bg-paper text-ink-mute' },
};

export const TX_METHODS = { cash: 'نقد', transfer: 'کارت به کارت / حواله', cheque: 'چک', pos: 'کارتخوان' };
export const TX_CATEGORIES = { sale: 'دریافت از خریدار', purchase: 'پرداخت به فروشنده/مالک', expense: 'هزینه', partner: 'شریک', commission: 'کمیسیون', other: 'سایر' };

export const DOC_GROUPS = [
  {
    title: 'مدارک خودرو',
    items: [
      { key: 'carCard', label: 'کارت خودرو' },
      { key: 'greenSheet', label: 'برگ سبز / سند' },
      { key: 'insurance', label: 'بیمه‌نامه شخص ثالث' },
      { key: 'inspection', label: 'معاینه فنی' },
      { key: 'spareKey', label: 'کلید یدک' },
      { key: 'serviceBook', label: 'دفترچه سرویس و گارانتی' },
    ],
  },
  {
    title: 'انتقال سند',
    items: [
      { key: 'fines', label: 'استعلام و پرداخت خلافی' },
      { key: 'municipalTax', label: 'عوارض شهرداری (پاک‌سازی)' },
      { key: 'sellerId', label: 'مدارک شناسایی فروشنده' },
      { key: 'buyerId', label: 'مدارک شناسایی خریدار' },
      { key: 'notary', label: 'وقت دفترخانه / تنظیم سند' },
      { key: 'police', label: 'تعویض پلاک در پلیس‌راهور' },
      { key: 'invoice', label: 'صدور فاکتور الکترونیکی (مودیان)' },
    ],
  },
];
export const ALL_DOC_KEYS = DOC_GROUPS.flatMap((g) => g.items);

export const PLATE_LETTERS = ['الف', 'ب', 'پ', 'ت', 'ث', 'ج', 'د', 'ز', 'س', 'ش', 'ص', 'ط', 'ع', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ه', 'ی', 'ژ'];

export const COMMON_BRANDS = ['پژو', 'ایران‌خودرو', 'سایپا', 'هایما', 'کیا', 'هیوندای', 'جک', 'تویوتا', 'ام‌وی‌ام', 'رنو', 'چری', 'فونیکس', 'بی‌ام‌و', 'بنز'];
export const COMMON_COLORS = ['سفید', 'مشکی', 'نقره‌ای', 'خاکستری', 'نوک‌مدادی', 'آبی', 'قرمز', 'سرمه‌ای', 'بژ', 'قهوه‌ای', 'سبز'];
