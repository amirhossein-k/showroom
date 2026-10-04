// ذخیره فایل روی فضای ابری پارس‌پک (S3-compatible، path-style)
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let client;
const env = (k) => (process.env[k] || '').trim();
const endpoint = () => env('PARSPACK_ENDPOINT').replace(/\/+$/, '');
const bucket = () => env('PARSPACK_BUCKET_NAME');

export const storageEnabled = () => !!(endpoint() && bucket() && env('PARSPACK_ACCESS_KEY') && env('PARSPACK_SECRET_KEY'));

function s3() {
  if (client) return client;
  client = new S3Client({
    endpoint: endpoint(),
    region: env('PARSPACK_REGION') || 'us-east-1', // پارس‌پک region را نادیده می‌گیرد
    forcePathStyle: true, // پارس‌پک: https://endpoint/bucket/key
    credentials: { accessKeyId: env('PARSPACK_ACCESS_KEY'), secretAccessKey: env('PARSPACK_SECRET_KEY') },
    // نسخه‌های جدید SDK هدر checksum اضافه می‌کنند که برخی سرویس‌های S3-compatible قبول نمی‌کنند
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

// اگر دامنه اختصاصی به باکت وصل کردی، در PARSPACK_PUBLIC_URL بگذار (مثلاً https://cdn.example.com)
export function publicUrl(key) {
  const custom = env('PARSPACK_PUBLIC_URL').replace(/\/+$/, '');
  return custom ? `${custom}/${key}` : `${endpoint()}/${bucket()}/${key}`;
}

export function keyFromUrl(url) {
  const prefixes = [env('PARSPACK_PUBLIC_URL').replace(/\/+$/, ''), `${endpoint()}/${bucket()}`].filter(Boolean);
  for (const p of prefixes) if (url?.startsWith(p + '/')) return url.slice(p.length + 1);
  return null;
}

export async function uploadBuffer(key, body, contentType) {
  const base = { Bucket: bucket(), Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' };
  try {
    await s3().send(new PutObjectCommand({ ...base, ACL: 'public-read' }));
  } catch (e) {
    // اگر باکت ACL را قبول نکرد (باکت عمومی است)، بدون ACL دوباره تلاش کن
    if (!/acl|notimplemented|accessdenied|invalidargument/i.test(`${e.name} ${e.Code || ''} ${e.message}`)) throw e;
    await s3().send(new PutObjectCommand(base));
  }
  return publicUrl(key);
}

export async function deleteByUrl(url) {
  const key = keyFromUrl(url);
  if (!key) return false;
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  return true;
}
