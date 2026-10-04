import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX = 8 * 1024 * 1024;

export async function POST(req) {
  try {
    const form = await req.formData();
    const dir = path.join(process.cwd(), 'uploads');
    await mkdir(dir, { recursive: true });
    const urls = [];
    for (const f of form.getAll('files')) {
      if (typeof f === 'string' || !f.size || f.size > MAX) continue;
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED.includes(ext)) continue;
      const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
      await writeFile(path.join(dir, name), Buffer.from(await f.arrayBuffer()));
      urls.push(`/api/files/${name}`);
    }
    return NextResponse.json({ urls });
  } catch (e) {
    return NextResponse.json({ error: 'آپلود انجام نشد' }, { status: 400 });
  }
}
