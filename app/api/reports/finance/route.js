import { NextResponse } from 'next/server';
import { getPeriod } from '@/lib/period';
import { buildFinanceReport, financeToXlsx } from '@/lib/finance';
import { fail } from '@/lib/crud';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/reports/finance?period=month|quarter|year|all&format=json|xlsx
export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const period = getPeriod(sp.get('period') || 'year');
    const report = await buildFinanceReport(period);
    if (sp.get('format') !== 'xlsx') return NextResponse.json(report);
    const buf = await financeToXlsx(report);
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="finance-${period.key}.xlsx"`,
      },
    });
  } catch (e) {
    return fail(e, 500);
  }
}
