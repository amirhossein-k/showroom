import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionPayload } from '../lib/transactionPayload.js';

const valid = { direction: 'in', category: 'sale', method: 'transfer', amount: 750000000, date: '2026-10-05T09:00:00Z', party: ' خریدار ', note: ' شرح ', car: null };

test('creation normalizes text/date and retains exact toman amounts', () => {
  const result = transactionPayload(valid);
  assert.equal(result.amount, 750000000);
  assert.equal(result.party, 'خریدار');
  assert.equal(result.note, 'شرح');
  assert.equal(result.date, '2026-10-05T09:00:00.000Z');
});
test('minimal creation supplies optional defaults', () => {
  const result = transactionPayload({ amount: 1, direction: 'out' });
  assert.equal(result.category, 'other');
  assert.equal(result.method, 'transfer');
  assert.ok(Number.isFinite(Date.parse(result.date)));
});
test('partial edit does not overwrite unrelated fields', () => {
  assert.deepEqual(transactionPayload({ amount: 2 }, { partial: true }), { amount: 2 });
});
test('metadata, contract links and operators cannot be assigned', () => {
  assert.deepEqual(transactionPayload({ amount: 2, _id: 'fake', contract: 'fake', $set: { amount: 0 } }, { partial: true }), { amount: 2 });
});
test('rejects nonpositive, fractional, nonnumeric and unsafe amounts', () => {
  for (const amount of [0, -1, 1.5, '10', null, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => transactionPayload({ ...valid, amount }));
  }
});
test('rejects missing amount/direction and invalid payload shapes', () => {
  for (const body of [null, [], 'text', {}, { amount: 2 }, { direction: 'in' }]) assert.throws(() => transactionPayload(body));
});
test('rejects invalid dates, directions, categories and methods', () => {
  for (const date of [null, '', 'bad', 0, {}]) assert.throws(() => transactionPayload({ ...valid, date }));
  for (const patch of [{ direction: 'bad' }, { category: 'bad' }, { method: 'bad' }, { category: 'toString' }]) assert.throws(() => transactionPayload({ ...valid, ...patch }));
});
test('car references must be IDs or explicit null', () => {
  assert.equal(transactionPayload({ car: '' }, { partial: true }).car, null);
  assert.equal(transactionPayload({ car: '507f1f77bcf86cd799439011' }, { partial: true }).car, '507f1f77bcf86cd799439011');
  for (const car of [{ _id: 'fake' }, 42, 'fake']) assert.throws(() => transactionPayload({ car }, { partial: true }));
});
test('linked transactions allow note-only updates', () => {
  assert.deepEqual(transactionPayload({ note: ' اصلاح شرح ' }, { partial: true, linked: true }), { note: 'اصلاح شرح' });
  for (const patch of [{ amount: 1 }, { car: null }, valid, { direction: 'out' }, { date: valid.date }, { party: 'new' }]) {
    assert.throws(() => transactionPayload(patch, { partial: true, linked: true }));
  }
});
test('rejects empty patches and nontext notes/parties', () => {
  assert.throws(() => transactionPayload({}, { partial: true }));
  assert.throws(() => transactionPayload({ note: {} }, { partial: true }));
  assert.throws(() => transactionPayload({ party: 1 }, { partial: true }));
});
