# ارتقای بخش قراردادها (قولنامه)

## نصب
1. همه فایل‌های این بسته را با همان مسیرها روی ریپو کپی کن (فایل‌های هم‌نام جایگزین می‌شوند).
2. در `app/settings/page.js` کامپوننت تنظیمات قولنامه را اضافه کن:
   ```jsx
   import ContractTermsSettings from '@/components/ContractTermsSettings';
   // داخل return، زیر بقیه تنظیمات:
   <ContractTermsSettings />
   ```
3. `npm run dev` و یک قولنامه پیش‌نویس + یک امضاشده تست کن.

## فایل‌ها
| فایل | وضعیت |
|---|---|
| lib/models.js | تغییر: وضعیت قسط، شهود با کد ملی، تاریخچه، تاریخ تحویل/انتقال، شمارنده، تنظیمات جدید |
| lib/contractDefaults.js | تغییر: وضعیت‌ها، اعتبارسنجی کد ملی/موبایل، خلاصه مالی |
| lib/contractService.js | جدید: کل منطق امضا/لغو/پرداخت/همگام‌سازی |
| app/api/contracts/route.js | تغییر: پیش‌نویس بدون اثر جانبی، شماره اتمیک |
| app/api/contracts/[id]/route.js | تغییر: ویرایش فقط پیش‌نویس، حذف قرارداد امضاشده ممنوع |
| app/api/contracts/[id]/status/route.js | جدید: sign / cancel / deliver / transfer |
| app/api/contracts/[id]/payments/[pid]/route.js | جدید: وضعیت هر قسط |
| app/api/cheques/[id]/route.js | تغییر: همگام‌سازی چک ← قرارداد |
| components/ContractForm.jsx | بازنویسی: شهود، پیش‌نویس/امضا، ویرایش، اعتبارسنجی |
| components/ContractManager.jsx | جدید: پنل مدیریت قرارداد |
| components/ContractTermsSettings.jsx | جدید: بندهای پیش‌فرض در تنظیمات |
| app/contracts/page.js | تغییر: تب وضعیت، جستجو، آمار |
| app/contracts/[id]/page.js | جدید: صفحه جزئیات |
| app/contracts/[id]/edit/page.js | جدید: ویرایش پیش‌نویس |
| app/contracts/[id]/print/page.js | تغییر: ماده‌بندی، شهود با نام، واترمارک پیش‌نویس/باطل، مبلغ به حروف هر قسط |
| app/cars/[id]/contract/page.js | تغییر: هشدار قرارداد تکراری |

## نکات
- قراردادهای قدیمی وضعیت `signed` دارند و بدون مهاجرت کار می‌کنند.
- `app/api/cheques/[id]/route.js` فرض کرده نسخه فعلی فقط `itemRoute(Cheque)` است؛ اگر منطق دیگری داشت، فقط بخش PATCH را ادغام کن.
- علامت «فروخته شد» کانال تلگرام با لغو قرارداد برنمی‌گردد.
