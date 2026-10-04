import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Car, Customer, Cheque, Transaction, Partner, Colleague, Setting } from '@/lib/models';

export const dynamic = 'force-dynamic';

const d = (days) => {
  const x = new Date();
  x.setDate(x.getDate() + days);
  x.setHours(12, 0, 0, 0);
  return x;
};
const M = 1_000_000;

// بارگذاری داده‌های نمونه برای آشنایی با سیستم (POST /api/seed?reset=1 همه چیز را پاک و از نو می‌سازد)
export async function POST(req) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== '1') {
    return NextResponse.json({ error: 'در حالت production غیرفعال است' }, { status: 403 });
  }
  await connectDB();
  const reset = req.nextUrl.searchParams.get('reset') === '1';
  if (!reset && (await Car.countDocuments()) > 0) {
    return NextResponse.json({ error: 'دیتابیس خالی نیست. برای بازنشانی از گزینه reset استفاده کنید.' }, { status: 409 });
  }
  await Promise.all([Car, Customer, Cheque, Transaction, Partner, Colleague].map((m) => m.deleteMany({})));
  await Setting.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main', showroomName: 'نمایشگاه اتو پارسیان' } }, { upsert: true });

  const [reza, majid, hamid] = await Partner.create([
    { name: 'رضا محمدی', phone: '09121112233' },
    { name: 'مجید کریمی', phone: '09123334455' },
    { name: 'حمید رستمی', phone: '09125556677' },
  ]);

  const cars = await Car.create([
    {
      brand: 'پژو', model: '206 تیپ 2', year: 1401, color: 'سفید', mileage: 38000, vin: 'NAAP03ED9NJ123456', engineNo: '139B0012345',
      plate: { p1: '22', letter: 'ب', p2: '481', region: '10' }, ownership: 'owned', status: 'available',
      purchasePrice: 655 * M, purchaseDate: d(-63), seller: { name: 'علی احمدی', phone: '09351234567' }, askingPrice: 745 * M,
      expenses: [{ type: 'inspection', amount: 1.5 * M, date: d(-63) }, { type: 'repair', title: 'تعویض لنت و روغن', amount: 6 * M, date: d(-58) }, { type: 'wash', amount: 1.2 * M, date: d(-57) }],
      partners: [{ partner: reza._id, name: reza.name, share: 40 }],
      docs: { carCard: true, greenSheet: true, insurance: true, inspection: true, spareKey: false },
    },
    {
      brand: 'ایران‌خودرو', model: 'دنا پلاس', year: 1402, color: 'مشکی', mileage: 21000, vin: 'NAAN11FE5PK654321',
      plate: { p1: '45', letter: 'ج', p2: '726', region: '20' }, ownership: 'owned', status: 'negotiating',
      purchasePrice: 1005 * M, purchaseDate: d(-18), seller: { name: 'مهدی صالحی', phone: '09191112233' }, askingPrice: 1120 * M,
      expenses: [{ type: 'transport', amount: 3 * M }, { type: 'brokerage', amount: 10 * M }, { type: 'admin', amount: 2 * M }],
      docs: { carCard: true, greenSheet: true, insurance: true, inspection: true, spareKey: true, serviceBook: true },
    },
    {
      brand: 'هایما', model: 'S7', year: 1400, color: 'سفید', mileage: 64000, vin: 'LVVDB11B5LD998877',
      plate: { p1: '68', letter: 'س', p2: '913', region: '44' }, ownership: 'owned', status: 'available',
      purchasePrice: 1830 * M, purchaseDate: d(-81), seller: { name: 'سعید نوری', phone: '09124445566' }, askingPrice: 2190 * M,
      expenses: [{ type: 'repair', title: 'صافکاری جزئی گلگیر', amount: 14 * M }, { type: 'inspection', amount: 2 * M }],
      partners: [{ partner: majid._id, name: majid.name, share: 50 }, { partner: hamid._id, name: hamid.name, share: 20 }],
      commissions: [{ name: 'کاوه', role: 'فروشنده', mode: 'percent', value: 0.5 }],
      docs: { carCard: true, greenSheet: true, insurance: false, inspection: true },
    },
    {
      brand: 'سایپا', model: 'شاهین', year: 1402, color: 'نقره‌ای', mileage: 9000, vin: 'NAS4111S0PT445566',
      plate: { p1: '17', letter: 'د', p2: '352', region: '77' }, ownership: 'consignment', status: 'available',
      consignor: { name: 'خانم رحیمی', phone: '09367778899' }, ownerPrice: 790 * M, purchaseDate: d(-12), askingPrice: 845 * M,
      expenses: [{ type: 'wash', amount: 1 * M }],
      docs: { carCard: true, greenSheet: true },
    },
    {
      brand: 'کیا', model: 'سراتو', year: 1396, color: 'نوک‌مدادی', mileage: 98000, vin: 'KNAFX411AH5112233',
      plate: { p1: '93', letter: 'م', p2: '618', region: '10' }, ownership: 'owned', status: 'reserved',
      purchasePrice: 1990 * M, purchaseDate: d(-30), askingPrice: 2240 * M,
      expenses: [{ type: 'repair', title: 'سرویس کامل', amount: 18 * M }, { type: 'transport', amount: 4 * M }],
      partners: [{ partner: reza._id, name: reza.name, share: 30 }],
    },
    {
      brand: 'پژو', model: 'پارس', year: 1400, color: 'سفید', mileage: 72000, vin: 'NAAN01CA8MK778899',
      plate: { p1: '34', letter: 'ق', p2: '275', region: '68' }, ownership: 'owned', status: 'available',
      purchasePrice: 790 * M, purchaseDate: d(-104), askingPrice: 865 * M,
      expenses: [{ type: 'repair', title: 'تعویض کمک‌فنر', amount: 9 * M }],
      docs: { carCard: true, greenSheet: true, insurance: true },
    },
    // فروخته‌شده‌ها
    {
      brand: 'پژو', model: '206 تیپ 2', year: 1401, color: 'خاکستری', mileage: 41000, vin: 'NAAP03ED1NJ000111',
      plate: { p1: '57', letter: 'ط', p2: '134', region: '10' }, ownership: 'owned', status: 'sold',
      purchasePrice: 640 * M, purchaseDate: d(-40), askingPrice: 715 * M, salePrice: 705 * M, saleDate: d(-6), buyerName: 'امید جعفری',
      expenses: [{ type: 'inspection', amount: 1.5 * M }, { type: 'repair', amount: 4 * M }],
      commissions: [{ name: 'کاوه', role: 'فروشنده', mode: 'fixed', value: 5 * M, paid: true }],
    },
    {
      brand: 'ایران‌خودرو', model: 'تارا', year: 1402, color: 'سفید', mileage: 15000, vin: 'NAAT21GM2PK222333',
      plate: { p1: '81', letter: 'ن', p2: '492', region: '20' }, ownership: 'owned', status: 'awaiting_transfer',
      purchasePrice: 1110 * M, purchaseDate: d(-25), askingPrice: 1210 * M, salePrice: 1185 * M, saleDate: d(-3), buyerName: 'نیما شریفی',
      expenses: [{ type: 'transport', amount: 3 * M }, { type: 'admin', amount: 1.5 * M }],
      partners: [{ partner: hamid._id, name: hamid.name, share: 50 }],
      commissions: [{ name: 'آقای صدری', role: 'واسطه', mode: 'fixed', value: 8 * M }, { name: 'کاوه', role: 'فروشنده', mode: 'fixed', value: 4 * M }],
      docs: { carCard: true, greenSheet: true, insurance: true, inspection: true, fines: true, sellerId: true, buyerId: true },
    },
    {
      brand: 'هیوندای', model: 'توسان', year: 1395, color: 'مشکی', mileage: 132000, vin: 'KMHJU81CBGU334455',
      plate: { p1: '11', letter: 'ص', p2: '807', region: '10' }, ownership: 'owned', status: 'sold',
      purchasePrice: 3600 * M, purchaseDate: d(-140), askingPrice: 3750 * M, salePrice: 3640 * M, saleDate: d(-15), buyerName: 'شرکت آرین',
      expenses: [{ type: 'repair', title: 'گیربکس', amount: 45 * M }, { type: 'inspection', amount: 3 * M }],
      partners: [{ partner: majid._id, name: majid.name, share: 50 }],
    },
  ]);
  const [c206, dena, haima, shahin, cerato, pars, sold206, tara, tucson] = cars;

  const customers = await Customer.create([
    { name: 'امید جعفری', phone: '09121230000', nationalId: '0012345678', source: 'divar', status: 'won', lastContact: d(-6) },
    { name: 'نیما شریفی', phone: '09129876543', nationalId: '0076543210', source: 'instagram', status: 'won', lastContact: d(-3) },
    { name: 'سارا موسوی', phone: '09351112244', source: 'divar', status: 'hot', wanted: 'دنا پلاس ۱۴۰۲', budgetMax: 1150 * M, interestedCars: [dena._id], nextFollowUp: d(0), lastContact: d(-2), notes: [{ text: 'برای دیدن ماشین با همسرش میاد', date: d(-2) }] },
    { name: 'فرهاد قاسمی', phone: '09107773344', source: 'walkin', status: 'warm', wanted: 'شاسی‌بلند تا ۲.۳ میلیارد', budgetMin: 1900 * M, budgetMax: 2300 * M, interestedCars: [haima._id, cerato._id], nextFollowUp: d(-1), lastContact: d(-5) },
    { name: 'مریم احمدی', phone: '09126665544', source: 'referral', referrer: 'رضا محمدی', status: 'warm', wanted: 'پژو ۲۰۶ سفید', budgetMax: 760 * M, interestedCars: [c206._id], lastContact: d(-7) },
    { name: 'کامران یزدانی', phone: '09198887766', source: 'instagram', status: 'new', wanted: 'شاهین صفر', nextFollowUp: d(2), lastContact: d(-1) },
    { name: 'بهروز نادری', phone: '09332221100', source: 'phone', status: 'cold', wanted: 'پارس', interestedCars: [pars._id], lastContact: d(-12) },
  ]);
  await Car.updateOne({ _id: sold206._id }, { buyer: customers[0]._id });
  await Car.updateOne({ _id: tara._id }, { buyer: customers[1]._id });

  await Cheque.create([
    { direction: 'received', number: '734512', bank: 'ملت', amount: 400 * M, dueDate: d(2), party: 'نیما شریفی', phone: '09129876543', car: tara._id, status: 'pending' },
    { direction: 'received', number: '118209', bank: 'صادرات', amount: 185 * M, dueDate: d(-1), party: 'امید جعفری', phone: '09121230000', car: sold206._id, status: 'pending', note: 'تماس گرفته شود' },
    { direction: 'issued', number: '550031', bank: 'پاسارگاد', amount: 600 * M, dueDate: d(5), party: 'سعید نوری', car: haima._id, status: 'pending' },
    { direction: 'received', number: '902211', bank: 'ملی', amount: 900 * M, dueDate: d(12), party: 'شرکت آرین', car: tucson._id, status: 'pending' },
    { direction: 'received', number: '440019', bank: 'تجارت', amount: 1200 * M, dueDate: d(-20), party: 'شرکت آرین', car: tucson._id, status: 'cleared' },
  ]);

  await Transaction.create([
    { car: sold206._id, direction: 'in', category: 'sale', method: 'transfer', amount: 520 * M, date: d(-6), party: 'امید جعفری' },
    { car: tara._id, direction: 'in', category: 'sale', method: 'transfer', amount: 600 * M, date: d(-3), party: 'نیما شریفی' },
    { car: tucson._id, direction: 'in', category: 'sale', method: 'transfer', amount: 1540 * M, date: d(-15), party: 'شرکت آرین' },
    { car: tucson._id, direction: 'in', category: 'sale', method: 'cheque', amount: 1200 * M, date: d(-20), party: 'شرکت آرین', note: 'چک ۴۴۰۰۱۹' },
    { car: c206._id, direction: 'out', category: 'purchase', method: 'transfer', amount: 655 * M, date: d(-63), party: 'علی احمدی' },
    { car: haima._id, direction: 'out', category: 'purchase', method: 'transfer', amount: 1230 * M, date: d(-81), party: 'سعید نوری' },
    { car: dena._id, direction: 'out', category: 'purchase', method: 'cash', amount: 1005 * M, date: d(-18), party: 'مهدی صالحی' },
    { car: dena._id, direction: 'out', category: 'commission', method: 'cash', amount: 10 * M, date: d(-18), party: 'واسطه خرید' },
  ]);

  await Colleague.create([
    {
      name: 'حاج آقا توکلی', showroom: 'نمایشگاه توکلی', phone: '02144556677', city: 'تهران - سعادت‌آباد',
      inventory: [
        { brand: 'تویوتا', model: 'کمری', year: 1395, color: 'سفید', mileage: 110000, price: 5200 * M },
        { brand: 'کیا', model: 'سراتو', year: 1397, color: 'مشکی', mileage: 76000, price: 2380 * M },
      ],
    },
    {
      name: 'امیر صفایی', showroom: 'اتو صفا', phone: '09121239876', city: 'کرج',
      inventory: [
        { brand: 'پژو', model: '206 تیپ 2', year: 1402, color: 'سفید', mileage: 18000, price: 790 * M },
        { brand: 'جک', model: 'S5', year: 1400, color: 'خاکستری', mileage: 52000, price: 1490 * M, note: 'بدون رنگ' },
        { brand: 'ام‌وی‌ام', model: 'X22', year: 1401, color: 'قرمز', mileage: 30000, price: 1030 * M },
      ],
    },
    {
      name: 'بهزاد کیانی', showroom: 'کیان موتور', phone: '09357654321', city: 'تهران - پاسداران',
      inventory: [{ brand: 'هایما', model: 'S7', year: 1401, color: 'مشکی', mileage: 41000, price: 2050 * M }],
    },
  ]);

  return NextResponse.json({ ok: true, cars: cars.length, customers: customers.length });
}
