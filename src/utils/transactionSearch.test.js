import { filterTransactions, normalizeTransactionSearch } from './transactionSearch';

const categories = [
  { name: 'Resumen tarjeta 💳', isExpense: true },
  { name: 'Venta divisas 💵', isExpense: false },
  { name: 'Alimentación', isExpense: true },
];

const docs = [
  {
    id: 'one', expenseName: 'Banco Ciudad Visa', category: 'Resumen tarjeta 💳',
    comment: 'Seguro auto, peajes', amount: '220356.4',
    selectedDate: '2026-10-13', selectedExpirationDate: '2026-10-30',
  },
  {
    id: 'two', expenseName: 'Banco Itaú', category: 'Venta divisas 💵',
    comment: 'Mantenimiento tarjeta débito', amount: 0,
    selectedDate: '2026-10-07', currencyQuantity: 500.25,
  },
  {
    id: 'three', expenseName: 'Mercado', category: 'Alimentación',
    comment: 'Café y pan', amount: 1280.5, selectedDate: '2026-09-03',
  },
];

const ids = (query, options = {}) =>
  filterTransactions(docs, { query, categories, ...options }).map((item) => item.id);

describe('transaction search and filters', () => {
  it('matches case/accents and partial names, descriptions or categories', () => {
    expect(ids('ITA')).toEqual(['two']);
    expect(ids('debito')).toEqual(['two']);
    expect(ids('alimentacion')).toEqual(['three']);
    expect(ids('PEAJ')).toEqual(['one']);
    expect(ids('tarjeta')).toEqual(['one', 'two']);
    expect(normalizeTransactionSearch('  CAFÉ   Y pan  ')).toBe('cafe y pan');
  });

  it('matches multiple terms across fields in any order', () => {
    expect(ids('visa seguro')).toEqual(['one']);
    expect(ids('peajes ciudad')).toEqual(['one']);
    expect(ids('pan mercado')).toEqual(['three']);
    expect(ids('visa cafe')).toEqual([]);
  });

  it('matches dates as DD/MM/YYYY or ISO and monetary locale formats', () => {
    expect(ids('13/10/2026')).toEqual(['one']);
    expect(ids('2026-09-03')).toEqual(['three']);
    expect(ids('30/10/2026')).toEqual(['one']);
    expect(ids('220.356,4')).toEqual(['one']);
    expect(ids('500,25')).toEqual(['two']);
  });

  it('combines category, type and text without changing the original data', () => {
    expect(ids('', { category: 'Resumen tarjeta 💳' })).toEqual(['one']);
    expect(ids('banco', { type: 'expense' })).toEqual(['one']);
    expect(ids('banco', { type: 'income' })).toEqual(['two']);
    expect(ids('', { category: 'Alimentación', type: 'income' })).toEqual([]);
    expect(docs.map((entry) => entry.id)).toEqual(['one', 'two', 'three']);
  });

  it('does not treat unknown categories as incomes and handles incomplete records', () => {
    const unknown = [{ id: 'missing', expenseName: null, category: null, comment: null }, ...docs];
    expect(filterTransactions(unknown, { type: 'income', categories }).map((x) => x.id))
      .toEqual(['two']);
    expect(filterTransactions(unknown, { query: 'cafe', categories }).map((x) => x.id))
      .toEqual(['three']);
    expect(filterTransactions(null, { query: 'visa' })).toEqual([]);
  });
});
