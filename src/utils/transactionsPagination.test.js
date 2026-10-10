import { TRANSACTION_PAGE_SIZE, visibleTransactionBatch } from './transactionsPagination';

test('large transaction histories render only first 40 cards without altering source', () => {
  const docs = Array.from({ length: 2408 }, (_, index) => ({ id: String(index), amount: index }));
  const batch = visibleTransactionBatch(docs);
  expect(TRANSACTION_PAGE_SIZE).toBe(40);
  expect(batch).toHaveLength(40);
  expect(batch[0]).toBe(docs[0]);
  expect(batch[39]).toBe(docs[39]);
  expect(docs).toHaveLength(2408);
  expect(visibleTransactionBatch(docs, 80)).toHaveLength(80);
  expect(visibleTransactionBatch(docs, 2408)).toHaveLength(2408);
});

test('search results and historical transaction sets are never mutated or duplicated', () => {
  const source = Object.freeze([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  expect(visibleTransactionBatch(source, 2).map((x) => x.id)).toEqual(['a', 'b']);
  expect(source).toHaveLength(3);
  expect(visibleTransactionBatch([])).toEqual([]);
  expect(visibleTransactionBatch(null)).toEqual([]);
  expect(visibleTransactionBatch(source, -20)).toEqual([]);
});

test('batch size handles invalid user-supplied limits safely', () => {
  const rows = Array.from({ length: 100 }, (_, index) => ({ index }));
  expect(visibleTransactionBatch(rows, Infinity)).toHaveLength(TRANSACTION_PAGE_SIZE);
  expect(visibleTransactionBatch(rows, 41.9)).toHaveLength(41);
});
