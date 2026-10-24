'use strict';

// A data-free, explicit contract for an ISOLATED synthetic Firestore account.
// Does not store tokens, financial amounts, personal identities or Firebase IDs.
const fs = require('node:fs');
const path = require('node:path');

const examplePath = '.qa-auth/banks-fixture.json';
const names = ['bankName', 'cardName', 'linkedPeriod', 'linkedMerchant', 'pendingPeriod'];
const period = /^20\d\d-(0[1-9]|1[0-2])$/;
const synthetic = /^LTC QA [\p{L}\p{N} ._-]{3,80}$/u;

function validateBanksFixture(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Banks QA requires a synthetic JSON fixture object.');
  }
  for (const key of names) {
    if (typeof data[key] !== 'string' || !data[key].trim()) {
      throw new Error('Banks QA fixture missing ' + key);
    }
  }
  for (const key of ['bankName','cardName','linkedMerchant']) {
    if (!synthetic.test(data[key])) {
      throw new Error(key + ' must start with "LTC QA " and contain synthetic-only data.');
    }
  }
  for (const key of ['linkedPeriod','pendingPeriod']) {
    if (!period.test(data[key])) throw new Error(key + ' must be YYYY-MM.');
  }
  if (!['ARS','USD'].includes(data.linkedCurrency)) {
    throw new Error('linkedCurrency must be ARS or USD.');
  }
  if (data.linkedPeriod === data.pendingPeriod) {
    throw new Error('Linked and pending fixture periods must differ.');
  }
  if (Object.keys(data).some(k => /secret|token|password|uid|email|address|cbu|cardnumber|amount/i.test(k))) {
    throw new Error('Do not store credentials, identities, bank details or balances in fixture.');
  }
  return Object.freeze(Object.fromEntries([...names,'linkedCurrency'].map(k=>[k,data[k]])));
}

function readBanksFixture(file = process.env.LTC_QA_BANKS_FIXTURE || examplePath) {
  const target=path.resolve(file);
  if (!fs.existsSync(target)) {
    throw new Error('Missing local synthetic Banks QA fixture: ' + file
      + '. Read docs/banks-authenticated-e2e.md and create ' + examplePath
      + ' (gitignored).');
  }
  return validateBanksFixture(JSON.parse(fs.readFileSync(target,'utf8')));
}

module.exports={validateBanksFixture,readBanksFixture,examplePath};
