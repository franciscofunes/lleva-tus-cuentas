const test=require('node:test');
const assert=require('node:assert/strict');
const {validateQaTarget}=require('./target-policy.cjs');
test('allows isolated Vercel preview / staging target and local development',()=>{
  assert.equal(validateQaTarget('https://llevatuscuentas-preview-example.vercel.app').hostname,'llevatuscuentas-preview-example.vercel.app');
  assert.equal(validateQaTarget('http://localhost:3000').host,'localhost:3000');
});
test('blocks production, credentials, HTTP remote, invalid schemes and malformed targets',()=>{
  for(const value of [
    'https://lleva-tus-cuentas.netlify.app',
    'https://llevatuscuentas.vercel.app',
    'http://llevatuscuentas-preview-example.vercel.app',
    'https://username:secret@preview.example.com',
    'https://preview.example.com/?token=secret',
    'file:///etc/passwd',
    'not-an-origin', '',
  ]) assert.throws(()=>validateQaTarget(value),{name:'Error'});
});
test('explicit production override is not the default',()=>{
  assert.equal(validateQaTarget('https://llevatuscuentas.vercel.app',true).hostname,'llevatuscuentas.vercel.app');
});
