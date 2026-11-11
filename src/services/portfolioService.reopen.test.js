import { firestore } from '../shared/config/firebase/firebase.config';
import {
  isCompletedPortfolioMonth,
  reopenPortfolioReconciliation,
  registerReconciliationTransaction,
  savePortfolioReconciliation,
} from './portfolioService';

jest.mock('../shared/config/firebase/firebase.config', () => ({
  firestore: { collection: jest.fn(), runTransaction: jest.fn() },
}));

const pathFor = (kind, id) => `users/user-1/${kind}/${id}`;
const reconciliationId = 'position-1_2026-11';
const reconciliation = {
  id: reconciliationId, positionId: 'position-1', month: '2026-11',
};
const reconciliationData = {
  positionId: 'position-1', month: '2026-11', currency: 'USD', amount: 6.12,
  status: 'registered', transactionId: 'return-1',
};
const automaticIncome = {
  importSource: 'portfolio-reconciliation',
  portfolioReconciliationId: reconciliationId,
  portfolioPositionId: 'position-1',
  portfolioPeriod: '2026-11',
  category: 'Ingreso divisas', currencyQuantity: 6.12,
};
let docs;

const collection = (path) => ({
  doc: (id = 'generated-transaction') => {
    const ref = { id, path: `${path}/${id}` };
    ref.collection = (child) => collection(`${ref.path}/${child}`);
    return ref;
  },
});

beforeEach(() => {
  docs = new Map();
  firestore.collection.mockReset();
  firestore.runTransaction.mockReset();
  firestore.collection.mockImplementation((name) => collection(name));
  firestore.runTransaction.mockImplementation(async (callback) => {
    const pending = [];
    const transaction = {
      get: jest.fn(async (ref) => ({
        exists: docs.has(ref.path),
        data: () => docs.get(ref.path),
      })),
      set: jest.fn((ref, value, options) => pending.push(() => {
        docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...value } : value);
      })),
      update: jest.fn((ref, value) => pending.push(() => docs.set(ref.path, { ...docs.get(ref.path), ...value }))),
      delete: jest.fn((ref) => pending.push(() => docs.delete(ref.path))),
    };
    const result = await callback(transaction);
    pending.forEach((write) => write());
    return result;
  });
});

test('reopens registered November in one atomic transaction without removing checks or October', async () => {
  docs.set(pathFor('portfolioReconciliations', reconciliationId), { ...reconciliationData });
  docs.set(pathFor('expenses', 'return-1'), { ...automaticIncome });
  docs.set(pathFor('portfolioSnapshots', 'earning-1'), { changeType: 'earning', observedEarning: 6.12 });
  docs.set(pathFor('portfolioReconciliations', 'position-1_2026-10'), { month: '2026-10', transactionId: 'october-1' });
  docs.set(pathFor('expenses', 'october-1'), { category: 'Ingreso divisas', portfolioPeriod: '2026-10' });
  docs.set(pathFor('expenses', 'manual-1'), { category: 'Ingreso divisas', currencyQuantity: 100 });

  await expect(reopenPortfolioReconciliation('user-1', reconciliation)).resolves.toEqual({
    alreadyReopened: false, removedTransaction: true,
  });
  expect(docs.has(pathFor('portfolioReconciliations', reconciliationId))).toBe(false);
  expect(docs.has(pathFor('expenses', 'return-1'))).toBe(false);
  expect(docs.has(pathFor('portfolioSnapshots', 'earning-1'))).toBe(true);
  expect(docs.has(pathFor('portfolioReconciliations', 'position-1_2026-10'))).toBe(true);
  expect(docs.has(pathFor('expenses', 'october-1'))).toBe(true);
  expect(docs.has(pathFor('expenses', 'manual-1'))).toBe(true);
});

test('reopening a pending close only deletes the close and can be retried safely', async () => {
  docs.set(pathFor('portfolioReconciliations', reconciliationId), { ...reconciliationData, transactionId: null });
  await expect(reopenPortfolioReconciliation('user-1', reconciliation)).resolves.toEqual({
    alreadyReopened: false, removedTransaction: false,
  });
  await expect(reopenPortfolioReconciliation('user-1', reconciliation)).resolves.toEqual({
    alreadyReopened: true, removedTransaction: false,
  });
});

test('missing linked transaction does not block reopening a stale registered month', async () => {
  docs.set(pathFor('portfolioReconciliations', reconciliationId), { ...reconciliationData });
  await expect(reopenPortfolioReconciliation('user-1', reconciliation)).resolves.toEqual({
    alreadyReopened: false, removedTransaction: false,
  });
  expect(docs.has(pathFor('portfolioReconciliations', reconciliationId))).toBe(false);
});

test.each([
  { portfolioReconciliationId: 'different-month' },
  { importSource: 'manual' },
  { portfolioPeriod: '2026-10' },
  { currencyQuantity: 99.99 },
  { category: 'Gasto' },
])('rejects modified or unrelated transaction %p, leaving both documents untouched', async (change) => {
  docs.set(pathFor('portfolioReconciliations', reconciliationId), { ...reconciliationData });
  docs.set(pathFor('expenses', 'return-1'), { ...automaticIncome, ...change });
  await expect(reopenPortfolioReconciliation('user-1', reconciliation)).rejects.toThrow(/modificado/);
  expect(docs.has(pathFor('portfolioReconciliations', reconciliationId))).toBe(true);
  expect(docs.has(pathFor('expenses', 'return-1'))).toBe(true);
});

test('rejects stale reconciliation identity rather than touching a different period', async () => {
  docs.set(pathFor('portfolioReconciliations', reconciliationId), { ...reconciliationData, month: '2026-10' });
  await expect(reopenPortfolioReconciliation('user-1', reconciliation)).rejects.toThrow(/cambió/);
  expect(docs.has(pathFor('portfolioReconciliations', reconciliationId))).toBe(true);
});

test('month validation blocks current/future/invalid periods and allows completed months', () => {
  const today = new Date('2026-11-11T12:00:00');
  expect(isCompletedPortfolioMonth('2026-11', today)).toBe(false);
  expect(isCompletedPortfolioMonth('2026-12', today)).toBe(false);
  expect(isCompletedPortfolioMonth('2026-10', today)).toBe(true);
  expect(isCompletedPortfolioMonth('2025-12', today)).toBe(true);
  expect(isCompletedPortfolioMonth('2026-00', today)).toBe(false);
});

test('existing registered close cannot be overwritten by a new close', async () => {
  const id = 'position-1_2026-10';
  const before = { ...reconciliationData, month: '2026-10' };
  docs.set(pathFor('portfolioReconciliations', id), before);
  await expect(savePortfolioReconciliation('user-1', { id: 'position-1', name: 'Example', currency: 'USD' }, '2026-10', [])).rejects.toThrow(/ya está registrado/);
  expect(docs.get(pathFor('portfolioReconciliations', id))).toEqual(before);
});

test('already-registered transaction remains idempotent without another income', async () => {
  const id = 'position-1_2026-10';
  docs.set(pathFor('portfolioReconciliations', id), { ...reconciliationData, month: '2026-10' });
  await expect(registerReconciliationTransaction('user-1', { id })).resolves.toEqual({
    transactionId: 'return-1', alreadyRegistered: true,
  });
  expect(firestore.runTransaction).toHaveBeenCalledTimes(1);
  expect(docs.size).toBe(1);
});
