import mongoose, { Schema } from 'mongoose';

const { ObjectId } = Schema.Types;

const plateSchema = new Schema({ p1: String, letter: String, p2: String, region: String, kind: { type: String, default: 'national' } }, { _id: false });
const personSchema = new Schema({ name: String, phone: String }, { _id: false });

const expenseSchema = new Schema({
  type: { type: String, default: 'other' },
  title: String,
  amount: { type: Number, default: 0 },
  date: Date,
});

const partnerShareSchema = new Schema({
  partner: { type: ObjectId, ref: 'Partner' },
  name: String,
  share: { type: Number, default: 0 }, // درصد مشارکت در سرمایه
});

const commissionSchema = new Schema({
  name: String,
  role: String,
  mode: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  value: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
});

// کارشناسی: وضعیت هر قطعه بدنه + وضعیت فنی
const inspectionSchema = new Schema(
  {
    body: { type: Schema.Types.Mixed, default: {} },
    tech: { type: Schema.Types.Mixed, default: {} },
    tiresPct: Number,
    inspector: String,
    date: Date,
    images: [String],
    notes: String,
  },
  { _id: false, minimize: false }
);

// پیام آگهی در کانال تلگرام
const channelPostSchema = new Schema(
  { chatId: String, messageId: Number, kind: String, postedAt: Date, soldMarked: { type: Boolean, default: false } },
  { _id: false }
);

const carSchema = new Schema(
  {
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    trim: String,
    year: Number,
    color: String,
    mileage: { type: Number, default: 0 },
    vin: { type: String, trim: true },
    engineNo: String,
    plate: plateSchema,
    images: [String],

    ownership: { type: String, enum: ['owned', 'consignment'], default: 'owned' },
    consignor: personSchema,
    ownerPrice: Number,

    status: { type: String, enum: ['available', 'negotiating', 'reserved', 'sold', 'awaiting_transfer'], default: 'available' },

    purchasePrice: { type: Number, default: 0 },
    purchaseDate: Date,
    seller: personSchema,

    askingPrice: Number,
    salePrice: Number,
    saleDate: Date,
    buyer: { type: ObjectId, ref: 'Customer' },
    buyerName: String,

    expenses: [expenseSchema],
    partners: [partnerShareSchema],
    commissions: [commissionSchema],

    docs: { type: Schema.Types.Mixed, default: {} },
    insuranceExpiry: Date,
    inspectionExpiry: Date,
    notes: String,

    inspection: { type: inspectionSchema, default: () => ({}) },
    channelPost: channelPostSchema,
    notifiedCustomers: [{ type: ObjectId, ref: 'Customer' }],
  },
  { timestamps: true, minimize: false }
);
carSchema.index({ brand: 1, model: 1, year: 1 });
carSchema.index({ status: 1 });

const noteSchema = new Schema({ text: String, date: { type: Date, default: Date.now } });

const customerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: String,
    nationalId: String,
    address: String,
    fatherName: String, // [جدید] برای قولنامه
    source: { type: String, default: 'walkin' },
    referrer: String,
    status: { type: String, default: 'new' },
    wanted: String,
    budgetMin: Number,
    budgetMax: Number,
    interestedCars: [{ type: ObjectId, ref: 'Car' }],
    nextFollowUp: Date,
    lastContact: Date,
    notes: [noteSchema],
    telegramChatId: String,
    notifyOptIn: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const chequeSchema = new Schema(
  {
    direction: { type: String, enum: ['received', 'issued'], default: 'received' },
    number: String,
    sayadId: String,
    bank: String,
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    party: String,
    phone: String,
    car: { type: ObjectId, ref: 'Car' },
    contract: { type: ObjectId, ref: 'Contract' },
    status: { type: String, default: 'pending' },
    note: String,
  },
  { timestamps: true }
);
chequeSchema.index({ contract: 1 });

const transactionSchema = new Schema(
  {
    car: { type: ObjectId, ref: 'Car' },
    contract: { type: ObjectId, ref: 'Contract' }, // [جدید]
    direction: { type: String, enum: ['in', 'out'], required: true },
    category: { type: String, default: 'other' },
    method: { type: String, default: 'transfer' },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    party: String,
    note: String,
  },
  { timestamps: true }
);

const partnerSchema = new Schema({ name: { type: String, required: true }, phone: String, note: String }, { timestamps: true });

const colleagueCarSchema = new Schema({
  brand: String,
  model: String,
  year: Number,
  color: String,
  mileage: Number,
  price: Number,
  note: String,
  updatedAt: { type: Date, default: Date.now },
});

const colleagueSchema = new Schema(
  {
    name: { type: String, required: true },
    showroom: String,
    phone: String,
    city: String,
    address: String,
    inventory: [colleagueCarSchema],
  },
  { timestamps: true }
);

// ───────── قولنامه ─────────
const partySchema = new Schema(
  { name: String, fatherName: String, nationalId: String, phone: String, address: String, birthCertNo: String, birthDate: Date, issuePlace: String }, // [upgrade-v2]
  { _id: false }
);
const witnessSchema = new Schema({ name: String, fatherName: String, nationalId: String, phone: String }, { _id: false });
const paymentSchema = new Schema({
  kind: { type: String, enum: ['cash', 'transfer', 'cheque'], default: 'cheque' },
  amount: { type: Number, default: 0 },
  dueDate: Date,
  bank: String,
  number: String,
  sayadId: String,
  status: { type: String, enum: ['pending', 'paid', 'bounced'], default: 'pending' }, // [جدید]
  paid: { type: Boolean, default: false }, // سازگاری با نسخه قبل
  paidAt: Date, // [جدید]
  note: String,
  cheque: { type: ObjectId, ref: 'Cheque' },
  transaction: { type: ObjectId, ref: 'Transaction' },
});
const historySchema = new Schema({ at: { type: Date, default: Date.now }, action: String, note: String }, { _id: false });

// [upgrade-v2] مدارک خودرو، فایل‌های بارگذاری‌شده، استعلام‌ها
const carDocsSchema = new Schema(
  { cardNo: String, documentNo: String, insurer: String, insurancePolicyNo: String, insuranceExpiry: Date, insuranceDiscountYears: Number },
  { _id: false }
);
const contractDocSchema = new Schema({
  type: { type: String, default: 'other' },
  title: String,
  key: String, // کلید فایل در فضای خصوصی — هرگز به کلاینت فرستاده نمی‌شود
  name: String,
  mime: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
});
const inquirySchema = new Schema({
  kind: { type: String, enum: ['fines', 'seizure'] },
  at: { type: Date, default: Date.now },
  ok: Boolean,
  provider: String,
  amount: Number,
  seized: Boolean,
  trackingCode: String,
  summary: String,
  note: String,
  raw: Schema.Types.Mixed,
});

const contractSchema = new Schema(
  {
    number: String,
    car: { type: ObjectId, ref: 'Car', required: true },
    customer: { type: ObjectId, ref: 'Customer' },
    seller: partySchema,
    buyer: partySchema,
    place: String, // محل تنظیم قرارداد
    date: { type: Date, default: Date.now },
    totalPrice: { type: Number, required: true },
    payments: [paymentSchema],
    deliveryDate: Date, // تحویل خودرو
    transferDate: Date, // حضور در دفترخانه/مرکز تعویض پلاک
    penaltyPerDay: { type: Number, default: 0 }, // وجه التزام روزانه
    terms: [String],
    witnesses: [witnessSchema],
    notes: String,
    status: { type: String, enum: ['draft', 'signed', 'cancelled'], default: 'draft' },
    signedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    deliveredAt: Date,
    transferredAt: Date,
    history: [historySchema],
    carDocs: { type: carDocsSchema, default: () => ({}) },
    documents: [contractDocSchema],
    inquiries: [inquirySchema],
  },
  { timestamps: true }
);
contractSchema.index({ car: 1, status: 1 });
contractSchema.index({ number: 1 });

// شمارنده اتمیک برای شماره قرارداد (جلوگیری از شماره تکراری)
const counterSchema = new Schema({ key: { type: String, unique: true }, seq: { type: Number, default: 0 } });

const settingSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    showroomName: { type: String, default: 'نمایشگاه خودرو' },
    monthlyCapitalRate: { type: Number, default: 2.5 },
    dormantDays: { type: Number, default: 45 },
    chequeAlertDays: { type: Number, default: 3 },
    coolingDays: { type: Number, default: 4 },
    overpriceThreshold: { type: Number, default: 7 },
    vatRate: { type: Number, default: 10 },
    economicCode: String,
    nationalId: String,
    telegramChatId: String,
    showroomPhone: String,
    showroomAddress: String,
    ownerName: String,
    telegramChannelId: String,
    autoPostChannel: { type: Boolean, default: true },
    autoNotifyMatches: { type: Boolean, default: true },
    contractTerms: [String],
    // [جدید] پیش‌فرض‌های قولنامه
    ownerFatherName: String,
    ownerNationalId: String,
    contractCity: String,
    defaultPenaltyPerDay: { type: Number, default: 0 },
    defaultTransferDays: { type: Number, default: 30 },
  },
  { timestamps: true }
);

const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

export const Car = model('Car', carSchema);
export const Customer = model('Customer', customerSchema);
export const Cheque = model('Cheque', chequeSchema);
export const Transaction = model('Transaction', transactionSchema);
export const Partner = model('Partner', partnerSchema);
export const Colleague = model('Colleague', colleagueSchema);
export const Contract = model('Contract', contractSchema);
export const Counter = model('Counter', counterSchema);
export const Setting = model('Setting', settingSchema);
