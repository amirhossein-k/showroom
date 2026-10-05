import { getMarket } from '@/lib/marketPrices';
export const dynamic = 'force-dynamic';
// خروجی JSON از قیمت‌های ثبت‌شده در صفحهٔ «قیمت بازار» (نه فایل پروژه)
export async function GET() {
  const m = await getMarket();
  return new Response(JSON.stringify(m, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="market-prices.json"' },
  });
}
