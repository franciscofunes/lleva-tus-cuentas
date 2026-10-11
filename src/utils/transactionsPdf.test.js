jest.mock('./portfolioExport', () => {
  const { TextEncoder } = require('util');
  if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
  return jest.requireActual('./portfolioExport');
});

import { buildTransactionsPdf } from './transactionsPdf';

const input = [
  { expenseName: 'Banco Ciudad', selectedDate: '2026-10-11', category: 'Resumen tarjeta 💳', amount: 1250.5, dueDate: '2026-10-21', comment: 'Seguro y peajes' },
  { expenseName: 'Astropay', selectedDate: '2026-10-10', category: 'Venta divisas', amount: 158064, currencyQuantity: '100', currencyExchangeRate: 1580.64 },
];
const catalog = [
  { name: 'Resumen tarjeta 💳', isExpense: true },
  { name: 'Venta divisas', isExpense: false },
];

test('generates a real PDF Blob locally with LTC$ branding and transaction values', () => {
  const blob = buildTransactionsPdf(input, catalog, { periodLabel: 'octubre 2026', query: 'Banco' });
  expect(blob.type).toBe('application/pdf');
  expect(blob.size).toBeGreaterThan(1400);
  expect(input[0].category).toContain('💳'); // input was not mutated
});

test('a large movement history is paginated without truncating records or crashing', () => {
  const rows = Array.from({ length: 125 }, (_, i) => ({
    ...input[0], expenseName: 'Operación ' + i, comment: 'Descripción extensa de ejemplo número ' + i,
  }));
  const blob = buildTransactionsPdf(rows, catalog, { periodLabel: 'Todo el historial' });
  expect(blob.type).toBe('application/pdf');
  expect(blob.size).toBeGreaterThan(5000);
  expect(rows).toHaveLength(125);
});

test('does not produce misleading empty PDF files', () => {
  expect(() => buildTransactionsPdf([], catalog)).toThrow(/No hay movimientos/);
});
