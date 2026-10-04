import { connectDB, plain } from './db';
import { Setting } from './models';

export async function getSettings() {
  await connectDB();
  let s = await Setting.findOne({ key: 'main' }).lean();
  if (!s) s = (await Setting.create({ key: 'main' })).toObject();
  return plain(s);
}
