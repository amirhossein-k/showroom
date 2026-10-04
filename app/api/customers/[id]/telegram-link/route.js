import { NextResponse } from 'next/server';
import { customerDeepLink } from '@/lib/customerLink';
import { fail } from '@/lib/crud';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const url = customerDeepLink(params.id);
  if (!url) return fail({ message: 'TELEGRAM_BOT_USERNAME در تنظیمات سرور خالی است.' });
  return NextResponse.json({ url });
}
