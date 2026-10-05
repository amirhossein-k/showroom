// ذخیره «خصوصی» مدارک هویتی (بدون لینک عمومی). فایل‌ها فقط از مسیر API و بعد از ورود قابل دریافت‌اند.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { storageEnabled } from './storage';

let client;
const env = (k) => (process.env[k] || '').trim();
const bucket = () => env('PARSPACK_PRIVATE_BUCKET') || env('PARSPACK_BUCKET_NAME');

function s3() {
  if (client) return client;
  client = new S3Client({
    endpoint: env('PARSPACK_ENDPOINT').replace(/\/+$/, ''),
    region: env('PARSPACK_REGION') || 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: env('PARSPACK_ACCESS_KEY'), secretAccessKey: env('PARSPACK_SECRET_KEY') },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

const localDir = () => path.join(process.cwd(), 'uploads', 'private');
const safeKey = (key) => key.replace(/\.\./g, '').replace(/^\/+/, '');

export async function putPrivate(key, body, contentType) {
  key = safeKey(key);
  if (!storageEnabled()) {
    const file = path.join(localDir(), key.replace(/\//g, '__'));
    await mkdir(localDir(), { recursive: true });
    await writeFile(file, body);
    return key;
  }
  const base = { Bucket: bucket(), Key: key, Body: body, ContentType: contentType };
  try {
    await s3().send(new PutObjectCommand({ ...base, ACL: 'private' }));
  } catch (e) {
    if (!/acl|notimplemented|accessdenied|invalidargument/i.test(`${e.name} ${e.Code || ''} ${e.message}`)) throw e;
    await s3().send(new PutObjectCommand(base));
  }
  return key;
}

export async function getPrivate(key) {
  key = safeKey(key);
  if (!storageEnabled()) return readFile(path.join(localDir(), key.replace(/\//g, '__')));
  const r = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return Buffer.from(await r.Body.transformToByteArray());
}

export async function deletePrivate(key) {
  key = safeKey(key);
  if (!storageEnabled()) return unlink(path.join(localDir(), key.replace(/\//g, '__'))).catch(() => {});
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
