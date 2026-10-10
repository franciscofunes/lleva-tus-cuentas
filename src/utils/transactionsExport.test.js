import {
  buildTransactionOverview, buildTransactionsExportSheets,
  buildTransactionsLitaMarkdown, exportTransactionsXlsx,
} from './transactionsExport';
import { exportWorkbookXlsx } from './portfolioExport';
jest.mock('./portfolioExport', () => ({ exportWorkbookXlsx: jest.fn() }));

const categories = [
  { name: 'Salud 🏥', isExpense: true },
  { name: 'Resumen tarjeta 💳', isExpense: true },
  { name: 'Venta divisas', isExpense: false },
  { name: 'Sueldo', isExpense: false },
];
const docs = [
  { expenseName: 'Farmacity', category: 'Salud 🏥', amount: '35079.00', selectedDate: '2026-10-10' },
  { expenseName: 'Banco Ciudad Visa', category: 'Resumen tarjeta 💳', amount: 1590805.54, selectedDate: '2026-10-09', dueDate: '2026-10-13' },
  { expenseName: 'Astropay', category: 'Venta divisas', currencyQuantity: '100', currencyExchangeRate: 1580.64, amount: 158064, selectedDate: '2026-10-08' },
  { expenseName: 'Salario', category: 'Sueldo', amount: 2500000, selectedDate: '2026-10-07' },
];

test('overview counts the actual current view without summing currency or duplicating card purchases', () => {
  expect(buildTransactionOverview(docs, categories)).toEqual({ count: 4, categoryCount: 4, dueCount: 1 });
  expect(buildTransactionOverview(docs.slice(0, 2), categories).count).toBe(2);
  expect(buildTransactionOverview([], categories).count).toBe(0);
});

test('XLSX contains only the provided view, separate USD quantity and category ARS expense totals', () => {
  const sheets = buildTransactionsExportSheets(docs, categories);
  expect(sheets.Movimientos).toHaveLength(5);
  const sale = sheets.Movimientos.find((r) => r[1] === 'Astropay');
  expect(sale[3]).toBe('Conversión ARS/USD');
  expect(sale[4]).toBe(158064);
  expect(sale[5]).toBe(100);
  expect(sale[6]).toBe(1580.64);
  const groups = sheets['Gastos por categoría'];
  expect(groups).toContainEqual(['Salud 🏥', 1, 35079]);
  expect(groups).toContainEqual(['Resumen tarjeta 💳', 1, 1590805.54]);
  expect(groups.some((row) => row[0] === 'Venta divisas')).toBe(false);
  exportTransactionsXlsx(docs, categories);
  expect(exportWorkbookXlsx).toHaveBeenCalledWith(sheets, expect.stringMatching(/^transacciones-ltc-.*\.xlsx$/));
});

test('Lita Markdown clearly labels ARS and USD and warns against double-counting card PDF items', () => {
  const md = buildTransactionsLitaMarkdown(docs, categories, new Date('2026-10-10T12:00:00Z'));
  expect(md).toContain('Movimientos registrados en el período/vista: 4');
  expect(md).toContain('Una compra/venta de divisas es conversión');
  expect(md).toContain('no sumes nuevamente los consumos individuales');
  expect(md).toContain('| Astropay | Venta divisas | Conversión ARS/USD | 158064 | 100 | 1580.64 |');
  expect(md).toContain('| Banco Ciudad Visa | Resumen tarjeta 💳 | Pago de resumen');
  expect(md).not.toContain('undefined');
});

test('large exports disclose truncation rather than presenting a partial view as complete', () => {
  const many = Array.from({ length: 265 }, (_, i) => ({ ...docs[0], expenseName: 'Expense ' + i }));
  const md = buildTransactionsLitaMarkdown(many, categories);
  expect(md).toContain('Movimientos incluidos en este prompt: 250');
  expect(md).toContain('15 movimientos omitidos');
});
