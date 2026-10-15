import {
  validateBankName, validBankId, validDate, validateBankAccount, validateBankCard,
  validateBankCharge, parseAmount, isStatementCategory, sumBankBalances, statementForCard,
} from './bankingModel';

test('bank IDs are owner-defined, safely formatted and not from a fixed catalog', () => {
  expect(validBankId('generated_ABC-123')).toBe(true);
  expect(validBankId('santander')).toBe(true); // legacy documents remain valid
  expect(validBankId('../outside')).toBe(false);
  expect(validBankId('')).toBe(false);
  expect(validBankId('a'.repeat(129))).toBe(false);
  expect(validateBankName('  Banco   Galicia  ')).toBe('Banco Galicia');
  expect(validateBankName(' Brubank ')).toBe('Brubank');
  expect(() => validateBankName('  ')).toThrow(/2 a 70/);
  expect(() => validateBankName('x'.repeat(71))).toThrow(/2 a 70/);
});

test('balances are independently recorded in ARS and USD with no FX inference', () => {
  const rows = [
    { bankId:'santander', currency:'ARS', balance:1000 },
    { bankId:'santander', currency:'USD', balance:42.5 },
    { bankId:'ciudad', currency:'ARS', balance:200 },
    { bankId:'ciudad', currency:'USD', balance:15 },
  ];
  expect(sumBankBalances(rows)).toEqual({ ARS:1200, USD:57.5 });
  expect(sumBankBalances(rows, 'santander')).toEqual({ ARS:1000, USD:42.5 });
  expect(sumBankBalances([], 'ciudad')).toEqual({ ARS:0, USD:0 });
});

test('only valid account metadata and numeric amounts, never bank passwords', () => {
  const base = { bankId:'santander',name:'Caja de ahorro ARS',type:'caja_ahorro',currency:'ARS',
    balance:'-25.50',alias:'mialias',cbu:'1234567890123456789012' };
  expect(validateBankAccount(base)).toEqual({ ...base, balance:-25.5 });
  expect(() => validateBankAccount({ ...base, cbu:'1234' })).toThrow(/22 dígitos/);
  expect(() => validateBankAccount({ ...base, currency:'EUR' })).toThrow(/Moneda/);
  expect(() => validateBankAccount({ ...base, balance:'1.000,25' })).toThrow(/importe/);
  expect(() => parseAmount('Infinity')).toThrow();
});

test('credit card model saves only last four digits and valid closing/due days', () => {
  const base = { bankId:'ciudad', nickname:'Visa Gold', brand:'Visa',lastFour:'3210',closingDay:'31',dueDay:'10' };
  expect(validateBankCard(base)).toEqual({ ...base, closingDay:31, dueDay:10 });
  expect(() => validateBankCard({ ...base, lastFour:'4111111111111111' })).toThrow(/4 dígitos/);
  expect(() => validateBankCard({ ...base, dueDay:32 })).toThrow(/entre 1 y 31/);
});

test('manually registered purchases never get added to cash-flow transactions', () => {
  const item = { bankId:'ciudad', cardId:'card-abc', merchant:'Farmacia',amount:'100.50',
    currency:'ARS',purchaseDate:'2026-10-13',installments:'3',note:'cuota 1' };
  expect(validateBankCharge(item)).toEqual({
    ...item, amount:100.5, installments:3, source:'manual', countedInCashFlow:false,
  });
  expect(() => validateBankCharge({ ...item, purchaseDate:'2026-02-31' })).toThrow(/Fecha/);
  expect(() => validateBankCharge({ ...item, amount:'-10' })).toThrow(/Importe/);
  expect(validDate('2026-10-13')).toBe(true);
});

test('statement details link to the card through existing expenseId without re-counting', () => {
  const statements = [
    { id:'a',expenseId:'e1',totals:{ARS:'350.00',USD:'0.00'} },
    { id:'b',expenseId:'e2',totals:{ARS:'100.00',USD:'10.00'} },
  ];
  expect(statementForCard(statements,[{expenseId:'e1',cardId:'card1'}],'card1')).toEqual([statements[0]]);
  expect(statementForCard(statements,[], 'card1')).toEqual([]);
  expect(isStatementCategory('Resumen tarjeta 💳')).toBe(true);
  expect(isStatementCategory('Venta divisas')).toBe(false);
});
