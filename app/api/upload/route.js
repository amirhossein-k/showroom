import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storageEnabled, uploadBuffer } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
// Vercel بدنه درخواست را حداکثر ~۴٫۵ مگابایت قبول می‌کند
const MAX = 4 * 1024 * 1024;

export async function POST(req) {
  try {
    const form = await req.formData();
    const urls = [];
    const skipped = [];
    const cloud = storageEnabled();
    const dir = path.join(process.cwd(), 'uploads');
    if (!cloud) await mkdir(dir, { recursive: true });

    for (const f of form.getAll('files')) {
      if (typeof f === 'string' || !f.size) continue;
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!TYPES[ext]) { skipped.push(`${f.name}: فرمت مجاز نیست`); continue; }
      if (f.size > MAX) { skipped.push(`${f.name}: بیشتر از ۴ مگابایت`); continue; }
      const now = new Date();
      const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
      const buf = Buffer.from(await f.arrayBuffer());
      if (cloud) {
        const key = `cars/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${name}`;
        urls.push(await uploadBuffer(key, buf, TYPES[ext]));
      } else {
        // حالت توسعه لوکال بدون فضای ابری
        await writeFile(path.join(dir, name), buf);
        urls.push(`/api/files/${name}`);
      }
    }
    return NextResponse.json({ urls, skipped });
  } catch (e) {
    console.error('upload error', e);
    return NextResponse.json({ error: 'آپلود انجام نشد: ' + (e?.message || '') }, { status: 400 });
  }
}
