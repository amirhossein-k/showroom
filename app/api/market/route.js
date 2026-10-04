import { readFile } from 'fs/promises';
import path from 'path';
export async function GET() { const data = await readFile(path.join(process.cwd(), 'data', 'market-prices.json')); return new Response(data, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="market-prices.json"' } }); }
