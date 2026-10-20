import { selectScopedTransactions, selectTransactionCards } from './transactionsPageView';
import { buildTransactionOverview, buildTransactionsExportSheets, buildTransactionsLitaMarkdown } from './transactionsExport';
import { summarizeBimonetaryFlows } from './bimonetarySummary';

// The XLSX writer creates a TextEncoder at module initialization; these tests
// check scopes and sheet rows, not the binary export engine.
jest.mock('./portfolioExport', () => ({
  exportWorkbookXlsx: jest.fn(), buildWorkbookXlsxBytes: jest.fn(),
}));

const categories = [
  { name: 'Comida', isExpense: true },
  { name: 'Suscripción USD', isExpense: true, currency: 'USD' },
  { name: 'Salario', isExpense: false },
];
const docs = [
  { id: 'meal', expenseName: 'Supermercado', category: 'Comida', amount: '1234567.89', selectedDate: '2026-10-11' },
  { id: 'usd', expenseName: 'Software', category: 'Suscripción USD', amount: '9999.25', transactionCurrency: 'USD', selectedDate: '2026-10-12' },
  { id: 'salary', expenseName: 'Nómina', category: 'Salario', amount: '2000000', selectedDate: '2026-10-10' },
];

test('list-only sorting and pagination do not change the period/filter scope used in exports and KPIs', () => {
  const filtered = selectScopedTransactions(docs, categories, { type: 'expense' });
  expect(filtered.map(({ id }) => id)).toEqual(['meal', 'usd']);
  const displayed = selectTransactionCards(filtered, { sortBy: 'name', sortDirection: 'desc', count: 1 });
  expect(displayed.map(({ id }) => id)).toEqual(['meal']);
  expect(filtered.map(({ id }) => id)).toEqual(['meal', 'usd']);
  expect(buildTransactionOverview(filtered, categories).count).toBe(2);
  expect(buildTransactionsExportSheets(filtered, categories).Movimientos).toHaveLength(3);
  const context = buildTransactionsLitaMarkdown(filtered, categories, new Date('2026-10-20T00:00:00Z'));
  expect(context).toContain('Supermercado');
  expect(context).toContain('Software');
  expect(context).not.toContain('Nómina');
});

test('native USD expense remains separately classified and never reclassified as ARS', () => {
  const filtered = selectScopedTransactions(docs, categories, { query: 'Software' });
  expect(filtered.map(({ id }) => id)).toEqual(['usd']);
  const output = buildTransactionsExportSheets(filtered, categories);
  expect(output.Movimientos[1]).toContain('USD');
  expect(output.Movimientos[1]).toContain(9999.25);
  expect(output.Movimientos[1]).not.toContain(1234567.89);
  const flows = summarizeBimonetaryFlows(filtered, categories);
  expect(flows.spentUsd).toBe(9999.25);
  expect(flows.spentArs).toBe(0);
});

test('category, search and transaction type intersect without changing source', () => {
  expect(selectScopedTransactions(docs, categories, { query: 'super', category: 'Comida', type: 'expense' }).map(x => x.id)).toEqual(['meal']);
  expect(selectScopedTransactions(docs, categories, { query: 'super', type: 'income' })).toEqual([]);
  expect(docs).toHaveLength(3);
});

test('sorting by ARS never treats a USD-native amount as comparable pesos', () => {
  const cards = selectTransactionCards(docs, { sortBy: 'amount', sortDirection: 'desc', count: 3 });
  expect(cards.map(x => x.id)).toEqual(['salary', 'meal', 'usd']);
});
