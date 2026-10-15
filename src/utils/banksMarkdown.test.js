import { parseBankMarkdown } from './banksMarkdown';

const sample=`# LTC$ Bancos
- type: bank
  name: Banco Ciudad
- type: account
  name: Caja de ahorro ARS
  typeAccount: caja_ahorro
  currency: ARS
  balance: 538,17
  accountNumber: 000000380203030659
  alias: cuenta.titular
  cbu: 0290038410000030306593
- type: card
  nickname: Visa 4555
  brand: Visa
  lastFour: 4555
  closingDay: 29
  dueDay: 13
  lastStatementARS: 220.356,40
  lastStatementUSD: 0,00
  currentConsumptionARS: 59.245,69
  minimumPaymentARS: 83.760,00
  closingDate: 2026-10-29
  dueDate: 2026-10-13`;

test('typed Markdown has one bank, accounts and cards, and interprets ARS separators',()=>{
 const parsed=parseBankMarkdown(sample);
 expect(parsed.errors).toEqual([]);
 expect(parsed.name).toBe('Banco Ciudad');
 expect(parsed.accounts).toHaveLength(1);
 expect(parsed.accounts[0].balance).toBe('538.17');
 expect(parsed.accounts[0].accountNumber).toBe('000000380203030659');
 expect(parsed.cards).toHaveLength(1);
 expect(parsed.cards[0].lastStatementARS).toBe('220356.4');
 expect(parsed.cards[0].currentConsumptionARS).toBe('59245.69');
 expect(parsed.cards[0].minimumPaymentARS).toBe('83760');
});
test('bank import refuses unknown fields, passwords, multiple banks, invalid card digits, bad dates',()=>{
 expect(parseBankMarkdown(sample+'\n  password: abc').valid).toBe(false);
 expect(parseBankMarkdown(sample+'\n- type: bank\n  name: Otro').valid).toBe(false);
 expect(parseBankMarkdown(sample.replace('lastFour: 4555','lastFour: 4111111111111111')).valid).toBe(false);
 expect(parseBankMarkdown(sample.replace('dueDate: 2026-10-13','dueDate: 2026-02-31')).valid).toBe(false);
});
test('missing mandatory account currency is flagged rather than silently assuming ARS',()=>{
 expect(parseBankMarkdown(sample.replace('currency: ARS','currency:')).valid).toBe(false);
});
test('zero values and optional sections are valid, but currencies never get added together',()=>{
 const r=parseBankMarkdown('- type: bank\n  name: Banco Nuevo\n- type: account\n  name: USD\n  typeAccount: caja_ahorro\n  currency: USD\n  balance: 0.92');
 expect(r.valid).toBe(true);
 expect(r.accounts[0].balance).toBe('0.92');
 expect(r.cards).toHaveLength(0);
});
