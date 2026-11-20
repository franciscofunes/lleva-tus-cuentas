import {
  parseTransactionNumber, isValidTransactionDate, validTransactionName, validTransactionComment,
} from './transactionFormValidation';

test.each([
 ['1.234,56',2,1234.56], ['1,234.56',2,1234.56],
 ['1234,56',2,1234.56], ['1234.56',2,1234.56],
 ['$ 1.234,56',2,1234.56], ['ARS 1.234,56',2,1234.56],
 ['USD 32,15',2,32.15], ['1.234',2,1234],
 ['0,01',2,0.01], ['1,23456789',8,1.23456789],
 ['1.23456789',8,1.23456789], ['1333.3333333333',10,1333.3333333333],
])('accepts financial decimal %s with up to %s decimals', (input,decimals,expected)=>{
 expect(parseTransactionNumber(input,decimals)).toBe(expected);
});
test.each(['',null,'0','-1','NaN','Infinity','1,234,56','1.234.56','123,4567',{},'abc','$','10,00,25'])(
  'refuses ambiguous, zero, negative, malformed or non-primitive amount %p', (input)=>{
  expect(parseTransactionNumber(input)).toBeNull();
});
test('valid calendar dates include leap days but not impossible dates',()=>{
 expect(isValidTransactionDate('2028-02-29')).toBe(true);
 expect(isValidTransactionDate('2026-02-29')).toBe(false);
 expect(isValidTransactionDate('2026-13-01')).toBe(false);
 expect(isValidTransactionDate('2026-11-19')).toBe(true);
});
test('names accept Unicode, symbols and spaces within 200 trimmed characters',()=>{
 expect(validTransactionName('🛒 Ñandú — Café #123')).toBe(true);
 expect(validTransactionName(' Z ')).toBe(true);
 expect(validTransactionName('ñ'.repeat(200))).toBe(true);
 expect(validTransactionName('ñ'.repeat(201))).toBe(false);
 expect(validTransactionName(' ')).toBe(false);
 expect(validTransactionName('abc\u0000')).toBe(false);
});
test('notes are optional and may contain long Unicode multiline text',()=>{
 expect(validTransactionComment('')).toBe(true);
 expect(validTransactionComment(null)).toBe(true);
 expect(validTransactionComment('🧾\n'+'Producto 🚕 '.repeat(300))).toBe(true);
 expect(validTransactionComment({})).toBe(false);
});
