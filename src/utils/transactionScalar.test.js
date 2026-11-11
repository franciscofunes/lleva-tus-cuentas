import { finiteTransactionNumber, transactionText } from './transactionScalar';

test('only finite numeric primitives qualify as financial amounts', () => {
  expect(finiteTransactionNumber('1250.75')).toBe(1250.75);
  expect(finiteTransactionNumber(500)).toBe(500);
  expect(finiteTransactionNumber('  ')).toBeNull();
  expect(finiteTransactionNumber('NaN')).toBeNull();
  expect(finiteTransactionNumber(Infinity)).toBeNull();
  expect(finiteTransactionNumber(Object.create(null))).toBeNull();
});

test('unsafe historical objects cannot enter search text or React children', () => {
  expect(transactionText('Comercio')).toBe('Comercio');
  expect(transactionText(2026)).toBe('2026');
  expect(transactionText(Object.create(null))).toBe('');
  expect(transactionText(Symbol('private'))).toBe('');
});
