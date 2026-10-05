import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../lib/receivables.js',import.meta.url),'utf8');
const {buildReceivableRows,filterRows,normalizeSearch} =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const car = {_id:'c1',brand:'پژو',model:'۲۰۶',buyerName:'علی کریمی',
  plate:{p1:'12',letter:'ب',p2:'345',region:'67'},
  salePrice:900000000,received:200000000,remaining:700000000};
test('keeps balances from overview',() => {
  const [r] = buildReceivableRows([car]);assert.equal(r.remaining,car.remaining);assert.equal(r.received,car.received);
});
test('omits zero and negative balances',() => {
  assert.equal(buildReceivableRows([{...car,remaining:0},{...car,remaining:-1}]).length,0);
});
test('keeps all signed contracts only',() => {
  const r = buildReceivableRows([car],[
    {_id:'k1',car:'c1',status:'signed'},{_id:'k2',car:{_id:'c1'},status:'signed'},
    {_id:'k3',car:'c1',status:'cancelled'},{_id:'k4',car:'c1',status:'draft'}])[0];
  assert.equal(r.contracts.length,2);
});
test('does not attach other cars contracts',() => {
  assert.equal(buildReceivableRows([car],[{_id:'k',car:'other',status:'signed'}])[0].contracts.length,0);
});
test('pending cheques not deducted again',() => {
  const r = buildReceivableRows([car],[],[
    {car:'c1',direction:'received',status:'pending',amount:100000000,dueDate:'2026-10-08'},
    {car:'c1',direction:'issued',status:'pending',amount:999},
    {car:'c1',direction:'received',status:'paid',amount:999},
    {car:'other',direction:'received',status:'pending',amount:999}])[0];
  assert.equal(r.pendingChequeAmount,100000000);assert.equal(r.pendingChequeCount,1);assert.equal(r.remaining,700000000);
});
test('earliest valid cheque due date',() => {
  const r = buildReceivableRows([car],[],['invalid','2026-10-20','2026-10-07'].map(dueDate =>
    ({car:'c1',direction:'received',status:'pending',amount:1,dueDate})))[0];
  assert.equal(r.nextChequeDue,'2026-10-07');
});
test('buyer fallback',() => {
  assert.equal(buildReceivableRows([{...car,buyerName:''}],
    [{_id:'k',car:'c1',status:'signed',buyer:{name:'رضا'}}])[0].buyerName,'رضا');
});
test('does not pass unrelated data',() => {
  const r = buildReceivableRows([{...car,fin:{secret:true},notes:'private'}])[0];
  assert.equal(r.fin,undefined);assert.equal(r.notes,undefined);
});
test('normalizes Persian Arabic letters and digits',() => {
  assert.equal(normalizeSearch('كريمي ۱۲٣'),'کریمی 123');
});
test('searches buyer model plate',() => {
  const rows = buildReceivableRows([car]);
  for(const q of ['كريمي','206','۱۲ ب ۳۴۵']) assert.equal(filterRows(rows,q).length,1);
  assert.equal(filterRows(rows,'سمند').length,0);
});
test('searches contract number',() => {
  const rows = buildReceivableRows([car],[{_id:'k',car:'c1',status:'signed',number:'۱۴۰۵-۹'}]);
  assert.equal(filterRows(rows,'1405-9').length,1);
});
test('receipt filters',() => {
  const rows = buildReceivableRows([car,{...car,_id:'c2',received:0}]);
  assert.equal(filterRows(rows,'','none')[0]._id,'c2');assert.equal(filterRows(rows,'','partial')[0]._id,'c1');
});
test('empty inputs',() => {assert.deepEqual(buildReceivableRows(),[]);assert.deepEqual(filterRows(),[]);});
