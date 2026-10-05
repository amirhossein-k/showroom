# ارتقای v2: تراکنش، مدارک، هویت کامل، استعلام، گزارش مالی واقعی

## نصب (۳ قدم)
1. همه فایل‌های این بسته را با همان مسیرها روی ریپو کپی کن (فایل‌های هم‌نام جایگزین می‌شوند).
2. از ریشه پروژه: `node scripts/upgrade-v2.mjs`
   این اسکریپت تغییرات کوچک را روی `lib/models.js`، `components/ContractForm.jsx`، `app/contracts/[id]/print/page.js` و `package.json` اعمال می‌کند
   (نسخه قبلی هر فایل با پسوند `.bak` کنارش می‌ماند؛ بعد از تست پاکشان کن). اجرای دوباره بی‌خطر است.
3. `npm install` (برای exceljs) و بعد `npm run dev`.
4. (اختیاری) لینک «گزارش مالی» → `/reports/finance` را به منوی `components/Shell.jsx` اضافه کن.

## ۱) تراکنش MongoDB
- `withTransaction` در `lib/db.js`: امضا، لغو، تحویل، انتقال سند، تغییر قسط، تغییر چک در دفتر چک، ویرایش و «ساخت + امضا» همه اتمیک‌اند.
  اگر وسط کار خطا بخورد، هیچ چک/تراکنش/تغییر وضعیت خودرو نصفه ثبت نمی‌شود (حتی شماره قرارداد هم مصرف نمی‌شود).
- پیام تلگرام «فروخته شد» بعد از commit اجرا می‌شود (بیرون از دیتابیس است).
- **نیازمند Replica Set**: MongoDB Atlas آماده است. لوکال: `mongod --replSet rs0` و یک بار `rs.initiate()`.
- روی Mongo تکی: در حالت توسعه با هشدار بدون تراکنش اجرا می‌شود؛ در production خطا می‌دهد مگر `MONGO_ALLOW_NO_TX=1` (توصیه نمی‌شود).
- تغییر رفتار: «ثبت نهایی» ناموفق دیگر پیش‌نویس نیمه‌کاره نمی‌سازد؛ خطا نمایش داده می‌شود و فرم دست‌نخورده می‌ماند.

## ۲) مدارک امضاشده
- پنل «مدارک قرارداد» در صفحه هر قرارداد: اسکن قولنامه، کارت ملی خریدار/فروشنده، کارت خودرو، شناسنامه، برگ سبز، بیمه‌نامه، رسید خلافی، تصویر چک…
- تصویر یا PDF تا ۴ مگابایت؛ برای قرارداد امضاشده هم مجاز است. چک‌لیست مدارک الزامی + برچسب «مدرک ناقص» در لیست قولنامه‌ها.
- فایل‌ها **خصوصی** ذخیره می‌شوند (بدون لینک عمومی) و فقط از `/api/contracts/:id/documents/:docId` و بعد از ورود قابل دریافت‌اند.
  برای امنیت بیشتر یک باکت خصوصی جدا بساز و در `PARSPACK_PRIVATE_BUCKET` بگذار. حتماً `ADMIN_PASSWORD` تنظیم باشد.

## ۳) اطلاعات هویتی و مدارک خودرو
- طرفین: شماره شناسنامه، محل صدور، تاریخ تولد (در فرم و نسخه چاپی).
- خودرو: شماره کارت، شماره سند، شرکت بیمه، شماره بیمه‌نامه، انقضا، سال‌های تخفیف.
- بعد از امضا هم می‌توان «مدارک خودرو» را ویرایش و فیلدهای هویتیِ **خالی** را تکمیل کرد (بازنویسی مقدار امضاشده ممنوع).
- استعلام خلافی/توقیف: ثبت دستی نتیجه همیشه فعال است. برای آنلاین، از یک ارائه‌دهنده مجاز قرارداد بگیر و در env بگذار:
  `INQUIRY_FINES_URL`، `INQUIRY_SEIZURE_URL`، `INQUIRY_TOKEN`، `INQUIRY_PROVIDER`؛ بعد `buildRequest`/`mapResponse` در `lib/inquiry.js` را با مستندات همان سرویس تطبیق بده.
  نتیجه آخرین استعلام در نسخه چاپی قولنامه هم می‌آید.

## ۴) گزارش مالی واقعی
- صفحه `/reports/finance` (ماه/۳ماه/سال/همه): سود هر خودرو بعد از هزینه‌ها، کمیسیون، خواب سرمایه و سهم شرکا + جدول ماهانه شمسی + جمع سهم هر شریک.
- خروجی اکسل راست‌به‌چپ با ۴ شیت: سود هر خودرو، ماهانه، سهم شرکا، کمیسیون‌ها → `/api/reports/finance?period=year&format=xlsx`

## ۵) قولنامه جدید
- قبلاً فقط از صفحه هر خودرو می‌شد قولنامه ساخت و صفحه «قولنامه‌ها» دکمه‌ای نداشت.
- حالا: دکمه «+ قولنامه جدید» → `/contracts/new` (جستجو و انتخاب خودرو، نمایش قولنامه امضاشده/پیش‌نویس باز هر خودرو، «ادامه پیش‌نویس»).
- دکمه «کپی به پیش‌نویس جدید» در صفحه قرارداد: بعد از لغو، قرارداد اصلاح‌شده را بدون تایپ دوباره بساز (به چک/تراکنش قبلی وصل نیست).

## فایل‌ها
| فایل | وضعیت |
|---|---|
| lib/db.js | تغییر: withTransaction |
| lib/contractService.js | بازنویسی: session در همه عملیات، هویت/مدارک، duplicateAsDraft |
| lib/contractDocs.js · lib/privateStorage.js · lib/inquiry.js · lib/finance.js | جدید |
| app/api/contracts/route.js · [id]/route.js · [id]/status · [id]/payments/[pid] · app/api/cheques/[id] | تغییر: تراکنش |
| app/api/contracts/[id]/documents (+ /[docId]) · [id]/inquiry · [id]/duplicate · app/api/reports/finance | جدید |
| app/contracts/page.js · app/contracts/[id]/page.js | تغییر |
| app/contracts/new/page.js · app/reports/finance/page.js | جدید |
| components/ContractDocuments · ContractInquiry · ContractDuplicateButton · ContractExtraFields · ContractExtraPrint | جدید |
| scripts/upgrade-v2.mjs | پچ models / ContractForm / print / package.json |

## env جدید
```
# MONGO_ALLOW_NO_TX=1          فقط اگر مجبوری روی Mongo تکی production بروی
# PARSPACK_PRIVATE_BUCKET=      باکت خصوصی مدارک (پیش‌فرض: همان باکت اصلی)
# INQUIRY_PROVIDER= INQUIRY_TOKEN= INQUIRY_FINES_URL= INQUIRY_SEIZURE_URL=
```
