// اجرای یک‌باره:  node scripts/patch-market-callers.mjs
// صفحه‌های خودرو و داشبورد را به getMarket() (فایل + قیمت دستی) وصل می‌کند.
import fs from 'fs';

const files = ['app/cars/page.js', 'app/cars/[id]/page.js', 'lib/overview.js'];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('⏭  پیدا نشد:', f); continue; }
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('getMarket')) { console.log('✔  قبلاً اعمال شده:', f); continue; }
  const rel = f.startsWith('lib/');
  const from = rel ? "'./market'" : "'@/lib/market'";
  const to = rel ? "'./marketPrices'" : "'@/lib/marketPrices'";
  s = s.replace(`import { marketAnalysis, ownDealsFor, loadMarket } from ${from};`, `import { marketAnalysis, ownDealsFor } from ${from};\nimport { getMarket } from ${to};`);
  s = s.replace(/=\s*loadMarket\(\);/g, '= await getMarket();');
  fs.writeFileSync(f, s);
  console.log('✅ به‌روز شد:', f);
}
