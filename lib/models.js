import mongoose, { Schema } from 'mongoose';

const { ObjectId } = Schema.Types;

const plateSchema = new Schema({ p1: String, letter: String, p2: String, region: String }, { _id: false });
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
  value: { type: Number, default: 0 }, // مبلغ ثابت یا درصد از قیمت فروش
  paid: { type: Boolean, default: false },
});

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
    consignor: personSchema, // مالک خودروی امانی
    ownerPrice: Number, // مبلغ توافقی با مالک امانی

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
    source: { type: String, default: 'walkin' },
    referrer: String,
    status: { type: String, default: 'new' },
    wanted: String, // خودروی مدنظر به صورت متن
    budgetMin: Number,
    budgetMax: Number,
    interestedCars: [{ type: ObjectId, ref: 'Car' }],
    nextFollowUp: Date,
    lastContact: Date,
    notes: [noteSchema],
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
    status: { type: String, default: 'pending' },
    note: String,
  },
  { timestamps: true }
);

const transactionSchema = new Schema(
  {
    car: { type: ObjectId, ref: 'Car' },
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

const settingSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    showroomName: { type: String, default: 'نمایشگاه خودرو' },
    monthlyCapitalRate: { type: Number, default: 2.5 }, // هزینه فرصت سرمایه (درصد ماهانه)
    dormantDays: { type: Number, default: 45 },
    chequeAlertDays: { type: Number, default: 3 },
    coolingDays: { type: Number, default: 4 },
    overpriceThreshold: { type: Number, default: 7 }, // درصد بالاتر از میانه بازار
    vatRate: { type: Number, default: 10 },
    economicCode: String,
    nationalId: String,
    telegramChatId: String,
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
export const Setting = model('Setting', settingSchema);
