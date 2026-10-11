import { sortTransactions, isTransactionSortKey } from './transactionSort';
import { filterTransactions } from './transactionSearch';
import { visibleTransactionBatch } from './transactionsPagination';

const records = [
  { id: 'first', selectedDate: '2026-10-04', expenseName: 'Árbol', category: 'Ingreso divisas', amount: '100', currencyQuantity: '10' },
  { id: 'second', selectedDate: '2026-10-13', expenseName: 'Banco', category: 'Alimentación', amount: '50', currencyQuantity: '500' },
  { id: 'third', selectedDate: '2026-10-13', expenseName: 'Banco', category: 'Alimentación', amount: '200', currencyQuantity: '5' },
  { id: 'missing', selectedDate: '', expenseName: '', category: null, amount: undefined, currencyQuantity: null },
];
const ids = (rows) => rows.map((item) => item.id);

test('sort date ascending/descending, with stable ties and unknown dates last', () => {
  expect(ids(sortTransactions(records, 'date', 'asc'))).toEqual(['first', 'second', 'third', 'missing']);
  expect(ids(sortTransactions(records, 'date', 'desc'))).toEqual(['second', 'third', 'first', 'missing']);
  expect(ids(records)).toEqual(['first', 'second', 'third', 'missing']);
});

test('compare ARS and USD separately without FX conversion or treating 0 as absent', () => {
  expect(ids(sortTransactions(records, 'amount', 'desc'))).toEqual(['third', 'first', 'second', 'missing']);
  expect(ids(sortTransactions(records, 'amount', 'asc'))).toEqual(['second', 'first', 'third', 'missing']);
  expect(ids(sortTransactions(records, 'usd', 'desc'))).toEqual(['second', 'first', 'third', 'missing']);
  expect(ids(sortTransactions(records, 'usd', 'asc'))).toEqual(['third', 'first', 'second', 'missing']);
  expect(ids(sortTransactions([{ id: 'zero', amount: 0 }, { id: 'not-set' }], 'amount', 'asc')))
    .toEqual(['zero', 'not-set']);
});

test('sort Spanish text and preserve original order when values tie', () => {
  expect(ids(sortTransactions(records, 'name', 'asc'))).toEqual(['first', 'second', 'third', 'missing']);
  expect(ids(sortTransactions(records, 'category', 'desc'))).toEqual(['first', 'second', 'third', 'missing']);
});

test('support dates from legacy strings, Date and Firestore timestamps; keep invalid last', () => {
  const rows = [
    { id: 'b', selectedExpirationDate: '30/10/2026' },
    { id: 'a', dueDate: '2026-10-10' },
    { id: 'c', dueDate: { toDate: () => new Date('2026-11-01T00:00:00Z') } },
    { id: 'missing', dueDate: 'invalid' },
  ];
  expect(ids(sortTransactions(rows, 'due', 'asc'))).toEqual(['a', 'b', 'c', 'missing']);
  expect(ids(sortTransactions(rows, 'due', 'desc'))).toEqual(['c', 'b', 'a', 'missing']);
});

test('filter first, sort second, paginate third; no changes to original filtered data', () => {
  const categories = [{ name: 'Alimentación', isExpense: true }];
  const filtered = filterTransactions(records, { category: 'Alimentación', categories });
  const sorted = sortTransactions(filtered, 'amount', 'desc');
  expect(ids(visibleTransactionBatch(sorted, 1))).toEqual(['third']);
  expect(ids(filtered)).toEqual(['second', 'third']);
  expect(records).toHaveLength(4);
  expect(isTransactionSortKey('amount')).toBe(true);
  expect(isTransactionSortKey('random')).toBe(false);
  expect(sortTransactions(null)).toEqual([]);
});

test('sort ARS and USD amounts separately and leave opposite-currency values last', () => {
  const rows = [
    {id:'usd-small',amount:3,transactionCurrency:'USD'},
    {id:'ars',amount:150,transactionCurrency:'ARS'},
    {id:'usd-large',amount:900,transactionCurrency:'USD'},
    {id:'legacy',amount:100},
  ];
  expect(ids(sortTransactions(rows,'amount','desc'))).toEqual(['ars','legacy','usd-small','usd-large']);
  expect(ids(sortTransactions(rows,'usdAmount','desc'))).toEqual(['usd-large','usd-small','ars','legacy']);
});
