import { statementDocumentId, verifyStatementDraft, saveReviewedStatement } from './cardStatementService'
import { auth, firestore } from '../shared/config/firebase/firebase.config'

jest.mock('../shared/config/firebase/firebase.config', () => {
  const set = jest.fn()
  const commit = jest.fn().mockResolvedValue(undefined)
  const expenseRef = { get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ category: 'Resumen tarjeta 💳' }) }) }
  const statementRef = {
    get: jest.fn().mockResolvedValue({ exists: false }),
    collection: jest.fn(() => ({ doc: jest.fn((id) => ({ path: 'items/' + id })) })),
  }
  const userRef = {
    collection: jest.fn((name) => ({
      doc: jest.fn((id) => name === 'expenses' ? expenseRef : statementRef),
    })),
  }
  return {
    auth: { currentUser: { uid: 'alice', getIdToken: jest.fn().mockResolvedValue('token') } },
    firestore: {
      collection: jest.fn(() => ({ doc: jest.fn(() => userRef) })),
      batch: jest.fn(() => ({ set, commit })),
    },
  }
})
const sample = {
  schema: 'ltc.card-statement.v1',
  fileSha256: 'a'.repeat(64),
  statement: {
    reconciliation: { ARS: true, USD: true },
    institution: 'Bank', cardBrand: 'Visa', period: '2026-10',
    closingDate: '2026-10-01', dueDate: '2026-10-09',
    totals: { ARS: '100.00', USD: '20.00' },
    purchases: { ARS: '100.00', USD: '20.00' },
    minimumPaymentArs: '0.00', taxesArs: '0.00', previousCreditArs: '0.00',
  },
  items: [
    { date: '2026-09-01', merchant: 'Shop', amount: '100.00', currency: 'ARS', receipt: '111111', sourcePage: 2 },
    { date: '2026-09-02', merchant: 'Service', amount: '20.00', currency: 'USD', receipt: '222222', sourcePage: 2 },
  ],
}

beforeEach(() => jest.clearAllMocks())

test('accepts only full document hashes and independently reconciled items', () => {
  expect(statementDocumentId('a'.repeat(64))).toHaveLength(64)
  expect(() => statementDocumentId('other-user')).toThrow()
  expect(verifyStatementDraft(sample)).toBe(true)
  expect(() => verifyStatementDraft({ ...sample, items: [{ ...sample.items[0], amount: '99.00' }, sample.items[1]] })).toThrow(/suma/)
})
test('saves only user-owned statement metadata + items; never creates expense rows for purchases', async () => {
  const id = await saveReviewedStatement({ uid: 'alice', expenseId: 'expense1', draft: sample })
  expect(id).toBe('a'.repeat(64))
  const b = firestore.batch.mock.results[0].value
  expect(b.set).toHaveBeenCalledTimes(3)
  const payloads = b.set.mock.calls.map((call) => call[1])
  expect(payloads[0]).toEqual(expect.objectContaining({
    expenseId: 'expense1', countedInCashFlow: false, itemCount: 2,
  }))
  expect(payloads[1].countedInCashFlow).toBe(false)
  expect(payloads[2].currency).toBe('USD')
  expect(b.commit).toHaveBeenCalledTimes(1)
})
test('rejects cross-user writes before Firestore', async () => {
  await expect(saveReviewedStatement({ uid: 'bob', expenseId: 'expense1', draft: sample })).rejects.toThrow(/Sesión/)
  expect(firestore.batch).not.toHaveBeenCalled()
})
