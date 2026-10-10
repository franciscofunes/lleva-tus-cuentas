import {
  buildTransactionOverview, buildTransactionsExportSheets,
  buildTransactionsLitaMarkdown, exportTransactionsXlsx,
} from './transactionsExport';
import { exportWorkbookXlsx, buildWorkbookXlsxBytes, worksheetXml, xlsxColumnName } from './portfolioExport';
import { filterTransactions } from './transactionSearch';
jest.mock('./portfolioExport', () => {
  const { TextEncoder } = require('util');
  if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
  return { ...jest.requireActual('./portfolioExport'), exportWorkbookXlsx: jest.fn() };
});

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

test('raw export preserves refunds and conversion rows even when FX category is marked as expense', () => {
  const rows = [...docs, { expenseName: 'Reintegro', category: 'Salud 🏥', amount: -150, selectedDate: '2026-10-09' }];
  const xlsx = buildTransactionsExportSheets(rows, [
    ...categories.filter((cat) => cat.name !== 'Venta divisas'),
    { name: 'Venta divisas', isExpense: true },
  ]);
  expect(xlsx.Movimientos.find((row) => row[1] === 'Reintegro')[4]).toBe(-150);
  expect(xlsx['Gastos por categoría'].some((row) => row[0] === 'Venta divisas')).toBe(false);
});

test('large exports disclose truncation rather than presenting a partial view as complete', () => {
  const many = Array.from({ length: 265 }, (_, i) => ({ ...docs[0], expenseName: 'Expense ' + i }));
  const md = buildTransactionsLitaMarkdown(many, categories);
  expect(md).toContain('Movimientos incluidos en este prompt: 250');
  expect(md).toContain('15 movimientos omitidos');
});

test('XLSX workbook serializes real cell references, headers, filters, rows and values', () => {
  const sheets = buildTransactionsExportSheets(docs, categories, {
    period: 'month',
    periodLabel: 'octubre 2026',
    query: 'astropay',
    category: 'Venta divisas',
    type: 'income',
  });
  const xml = worksheetXml(sheets.Movimientos);
  expect(xml).toContain('<dimension ref="A1:K5"/>');
  expect(xml).toContain('<c r="A1" t="inlineStr">');
  expect(xml).toContain('<c r="B2" t="inlineStr">');
  expect(xml).toContain('<c r="E4"><v>158064</v></c>');
  expect(xml).toContain('<autoFilter ref="A1:K5"/>');
  expect(xml).toContain('state="frozen"');
  expect(xlsxColumnName(0)).toBe('A');
  expect(xlsxColumnName(10)).toBe('K');
  expect(xlsxColumnName(26)).toBe('AA');
  const binary = Buffer.from(buildWorkbookXlsxBytes(sheets)).toString('utf8');
  expect(binary).toContain('xl/worksheets/sheet1.xml');
  expect(binary).toContain('Movimientos');
  expect(binary).toContain('Gastos por categoría');
  expect(binary).toContain('Filtros aplicados');
  expect(binary).toContain('Astropay');
  expect(binary).toContain('octubre 2026');
});

test.each([
  ['all', '', '', 4],
  ['expense', '', '', 2],
  ['income', '', '', 2],
  ['all', 'Salud 🏥', '', 1],
  ['all', '', 'astropay', 1],
  ['all', 'Resumen tarjeta 💳', 'ciudad', 1],
  ['income', 'Venta divisas', 'astropay', 1],
])('Excel exports exactly the active type/category/search results: %s / %s / %s', (type, category, query, count) => {
  const filtered = filterTransactions(docs, { type, category, query, categories });
  const sheets = buildTransactionsExportSheets(filtered, categories, { type, category, query, period: 'month' });
  expect(filtered).toHaveLength(count);
  expect(sheets.Movimientos).toHaveLength(count + 1);
  expect(sheets['Filtros aplicados']).toContainEqual(['Movimientos exportados', count]);
  expect(sheets['Gastos por categoría'].slice(1).every((row) => row[1] > 0)).toBe(true);
});

test('exports all filtered movements rather than only the first 40 rendered cards', () => {
  const many = Array.from({ length: 2408 }, (_, i) => ({
    ...docs[0], expenseName: 'Movimiento ' + i, selectedDate: '2026-10-10',
  }));
  const filtered = filterTransactions(many, { type: 'expense', categories });
  const sheets = buildTransactionsExportSheets(filtered, categories, { periodLabel: 'octubre 2026' });
  expect(sheets.Movimientos).toHaveLength(2409);
  expect(sheets['Gastos por categoría']).toContainEqual(['Salud 🏥', 2408, 84470232]);
  expect(worksheetXml(sheets.Movimientos)).toContain('<c r="K2409"');
  expect(worksheetXml(sheets.Movimientos)).toContain('<autoFilter ref="A1:K2409"/>');
});

test('preserves XML-special characters and prevents cell formula injection', () => {
  const xml = worksheetXml([['Nombre','Importe'], ['=HYPERLINK("bad") & <script>', 1250]]);
  expect(xml).toContain('r="A2" t="inlineStr"');
  expect(xml).toContain('=HYPERLINK(&quot;bad&quot;) &amp; &lt;script&gt;');
  expect(xml).not.toContain('<f>');
});
