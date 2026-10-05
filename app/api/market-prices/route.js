import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { fail } from '@/lib/crud';
import { normalizeFa } from '@/lib/persian';
import { MarketPrice, sanitizeMarketPrice } from '@/lib/marketPrices';

export const dynamic = 'force-dynamic';

// GET /api/market-prices?brand=&model=&year=
export async function GET(req) {
  try {
    await connectDB();
    const sp = new URL(req.url).searchParams;
    const q = {};
    if (sp.get('year')) q.year = Number(sp.get('year'));
    let docs = await MarketPrice.find(q).sort({ date: -1, createdAt: -1 }).limit(3000).lean();
    const b = normalizeFa(sp.get('brand'));
    const m = normalizeFa(sp.get('model'));
    if (b) docs = docs.filter((d) => normalizeFa(d.brand) === b);
    if (m) docs = docs.filter((d) => normalizeFa(d.model) === m);
    return NextResponse.json(docs);
  } catch (e) {
    return fail(e, 500);
  }
}

// POST یک قیمت: { brand, model, ... }  |  ورود گروهی: { items: [ ... ] }
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    if (Array.isArray(body?.items)) {
      if (!body.items.length) throw Object.assign(new Error('هیچ ردیفی برای ثبت نیست.'), { status: 400 });
      if (body.items.length > 500) throw Object.assign(new Error('حداکثر ۵۰۰ ردیف در هر بار.'), { status: 400 });
      const items = body.items.map((it, i) => {
        try {
          return sanitizeMarketPrice(it);
        } catch (e) {
          throw Object.assign(new Error(`ردیف ${i + 1}: ${e.message}`), { status: 400 });
        }
      });
      const docs = await MarketPrice.insertMany(items);
      return NextResponse.json({ ok: true, count: docs.length }, { status: 201 });
    }
    const doc = await MarketPrice.create(sanitizeMarketPrice(body));
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return fail(e, e.status || 400);
  }
}
