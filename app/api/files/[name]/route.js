import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export async function GET(_req, { params }) {
  const name = path.basename(params.name);
  const ext = name.split('.').pop().toLowerCase();
  try {
    const buf = await readFile(path.join(process.cwd(), 'uploads', name));
    return new Response(buf, { headers: { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
