import mongoose from 'mongoose';

let cached = global._autodarMongoose;
if (!cached) cached = global._autodarMongoose = { conn: null, promise: null, txSupported: null };

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI در فایل .env.local تعریف نشده است.');
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 8000 }).catch((e) => {
      cached.promise = null;
      throw e;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export function plain(doc) {
  return JSON.parse(JSON.stringify(doc ?? null));
}

// ───────── تراکنش MongoDB ─────────
// نیازمند Replica Set است (MongoDB Atlas به‌صورت پیش‌فرض دارد).
// روی MongoDB تکی (standalone) فقط در حالت توسعه یا با MONGO_ALLOW_NO_TX=1 بدون تراکنش اجرا می‌شود.
const noReplicaSet = (e) =>
  e?.code === 20 || e?.codeName === 'IllegalOperation' || /replica set|mongos|Transaction numbers are only allowed/i.test(e?.message || '');

const allowFallback = () => process.env.NODE_ENV !== 'production' || process.env.MONGO_ALLOW_NO_TX === '1';

async function runAfter(tx) {
  for (const f of tx.after) {
    try {
      await f();
    } catch (e) {
      console.error('after-commit hook failed', e);
    }
  }
}

/**
 * اجرای اتمیک: همه نوشتن‌ها داخل fn یا با هم ثبت می‌شوند یا هیچ‌کدام.
 * fn({ session, after }) — کارهای بیرونی (تلگرام، پیامک…) را در after.push(() => …) بگذار تا فقط بعد از commit اجرا شوند.
 * نکته: fn ممکن است در خطاهای گذرا دوباره اجرا شود؛ اسناد را داخل fn و با session بخوان.
 */
export async function withTransaction(fn) {
  await connectDB();
  if (cached.txSupported !== false && process.env.MONGO_TRANSACTIONS !== 'off') {
    const session = await mongoose.startSession();
    const tx = { session, after: [] };
    try {
      let result;
      await session.withTransaction(
        async () => {
          tx.after = [];
          result = await fn(tx);
        },
        { readPreference: 'primary', readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
      );
      cached.txSupported = true;
      await runAfter(tx);
      return result;
    } catch (e) {
      if (!noReplicaSet(e)) throw e;
      cached.txSupported = false;
      if (!allowFallback())
        throw new Error('دیتابیس از تراکنش پشتیبانی نمی‌کند (Replica Set نیست). برای امنیت داده، عملیات انجام نشد. از MongoDB Atlas یا Replica Set استفاده کن.');
      console.warn('[db] MongoDB بدون Replica Set است؛ عملیات بدون تراکنش اجرا می‌شود (فقط برای توسعه).');
    } finally {
      await session.endSession();
    }
  }
  if (!allowFallback()) throw new Error('تراکنش دیتابیس در دسترس نیست.');
  const tx = { session: null, after: [] };
  const result = await fn(tx);
  await runAfter(tx);
  return result;
}
