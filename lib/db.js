import mongoose from 'mongoose';

let cached = global._autodarMongoose;
if (!cached) cached = global._autodarMongoose = { conn: null, promise: null };

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
