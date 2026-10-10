import {
  CATEGORY_EXTRA_FIELD_CATALOG,
  MAX_EXTRA_FIELDS,
  getCategoryExtraFields,
  validateCategoryExtraFields,
  sanitizeTransactionCustomDetails,
  displayTransactionCustomDetails,
} from './categoryExtraFields';

test('offers a bounded controlled field catalog and preserves requested order', () => {
  expect(CATEGORY_EXTRA_FIELD_CATALOG).toHaveLength(5);
  expect(MAX_EXTRA_FIELDS).toBe(3);
  expect(getCategoryExtraFields({ extraFieldIds: ['paymentMethod', 'reference'] }).map((x) => x.id))
    .toEqual(['paymentMethod', 'reference']);
  expect(getCategoryExtraFields({})).toEqual([]);
});

test('rejects unrecognized identifiers, duplicate selections and more than 3 fields', () => {
  expect(validateCategoryExtraFields(['amount'])).toMatch(/no permitidos/);
  expect(validateCategoryExtraFields(['reference', 'reference'])).toMatch(/repetidos/);
  expect(validateCategoryExtraFields(['reference', 'counterparty', 'paymentMethod', 'receiptNumber']))
    .toMatch(/hasta 3/);
});

test('keeps only allowed category fields and normalizes text', () => {
  expect(sanitizeTransactionCustomDetails({
    reference: '   OP-123   ', counterparty: 'Tienda',
    paymentMethod: 'transferencia', amount: '999999',
  }, ['reference', 'paymentMethod']))
    .toEqual({ reference: 'OP-123', paymentMethod: 'transferencia' });
});

test('rejects invalid options, dates, multiline data and arbitrary keys', () => {
  expect(() => sanitizeTransactionCustomDetails({ paymentMethod: 'crypto' }, ['paymentMethod']))
    .toThrow(/Opción inválida/);
  expect(() => sanitizeTransactionCustomDetails({ operationDate: '2026-02-30' }, ['operationDate']))
    .toThrow(/Fecha inválida/);
  expect(() => sanitizeTransactionCustomDetails({ reference: 'x\ny' }, ['reference']))
    .toThrow(/Valor inválido/);
  expect(() => sanitizeTransactionCustomDetails({ category: 'Override' }, ['category']))
    .toThrow(/no permitidos/);
});

test('optional data remains empty and displays select labels', () => {
  expect(sanitizeTransactionCustomDetails({ reference: '' }, ['reference'])).toEqual({});
  expect(displayTransactionCustomDetails({ reference: 'A-123', paymentMethod: 'debito' }))
    .toEqual([
      { id: 'reference', label: 'Referencia / ID de operación', value: 'A-123' },
      { id: 'paymentMethod', label: 'Medio de pago', value: 'Débito' },
    ]);
});

test('accepts a real calendar day but never a rolled-over invalid date', () => {
  expect(sanitizeTransactionCustomDetails({ operationDate: '2026-10-10' }, ['operationDate']))
    .toEqual({ operationDate: '2026-10-10' });
  expect(() => sanitizeTransactionCustomDetails({ operationDate: '2026-13-10' }, ['operationDate']))
    .toThrow(/Fecha inválida/);
});
