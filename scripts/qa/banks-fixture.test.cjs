'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {validateBanksFixture} = require('./banks-fixture.cjs');

const sample = {
  bankName:'LTC QA Banco Demo', cardName:'LTC QA Visa Demo',
  linkedPeriod:'2026-10', pendingPeriod:'2026-09',
  linkedMerchant:'LTC QA Compra ARS', linkedCurrency:'ARS',
};

test('Banks fixture validates synthetic bank/card/merchant and distinct statement periods',()=>{
  assert.deepEqual(validateBanksFixture(sample),sample);
  assert.ok(Object.isFrozen(validateBanksFixture(sample)));
});
test('rejects production-looking fixtures and accidental sensitive data',()=>{
  for(const patch of [
    {bankName:'Santander'},
    {linkedMerchant:'Farmacity'},
    {pendingPeriod:'2026-10'},
    {linkedPeriod:'bad'},
    {linkedCurrency:'EUR'},
    {uid:'firebase-user-123'},
    {password:'no'},
    {cardNumber:'1234'},
  ]) assert.throws(()=>validateBanksFixture({...sample,...patch}));
});
test('requires all fields and cannot accept non-object or array',()=>{
  assert.throws(()=>validateBanksFixture(null));
  assert.throws(()=>validateBanksFixture([]));
  assert.throws(()=>validateBanksFixture({...sample,cardName:''}));
});
