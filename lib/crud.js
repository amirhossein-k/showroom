import { NextResponse } from 'next/server';
import { connectDB } from './db';

const STRIP = ['_id', '__v', 'createdAt', 'updatedAt'];
export function clean(body) {
  const b = { ...(body || {}) };
  STRIP.forEach((k) => delete b[k]);
  return b;
}

export function fail(e, status = 400) {
  const msg = e?.name === 'ValidationError' ? 'اطلاعات ناقص یا نامعتبر است: ' + Object.keys(e.errors || {}).join('، ') : e?.message || 'خطای ناشناخته';
  return NextResponse.json({ error: msg }, { status });
}

export function collectionRoute(Model, { sort = { createdAt: -1 }, populate } = {}) {
  return {
    GET: async () => {
      try {
        await connectDB();
        let q = Model.find({}).sort(sort);
        if (populate) q = q.populate(populate);
        return NextResponse.json(await q.lean());
      } catch (e) {
        return fail(e, 500);
      }
    },
    POST: async (req) => {
      try {
        await connectDB();
        const doc = await Model.create(clean(await req.json()));
        return NextResponse.json(doc, { status: 201 });
      } catch (e) {
        return fail(e);
      }
    },
  };
}

export function itemRoute(Model, { populate } = {}) {
  return {
    GET: async (_req, { params }) => {
      try {
        await connectDB();
        let q = Model.findById(params.id);
        if (populate) q = q.populate(populate);
        const doc = await q.lean();
        if (!doc) return fail({ message: 'یافت نشد' }, 404);
        return NextResponse.json(doc);
      } catch (e) {
        return fail(e, 500);
      }
    },
    PATCH: async (req, { params }) => {
      try {
        await connectDB();
        const doc = await Model.findByIdAndUpdate(params.id, { $set: clean(await req.json()) }, { new: true, runValidators: true });
        if (!doc) return fail({ message: 'یافت نشد' }, 404);
        return NextResponse.json(doc);
      } catch (e) {
        return fail(e);
      }
    },
    DELETE: async (_req, { params }) => {
      try {
        await connectDB();
        await Model.findByIdAndDelete(params.id);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return fail(e);
      }
    },
  };
}
