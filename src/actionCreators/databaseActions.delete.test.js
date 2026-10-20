import { firestore } from '../shared/config/firebase/firebase.config';
import { toast } from 'react-toastify';
import { deleteCardAction } from './databaseActions';

jest.mock('../shared/config/firebase/firebase.config', () => ({
  firestore: { collection: jest.fn() },
}));
jest.mock('react-toastify', () => ({
  toast: { warn: jest.fn(), error: jest.fn(), success: jest.fn() },
}));

let removeExpense, removeNotification, userCollection;
beforeEach(() => {
  jest.clearAllMocks();
  removeExpense = jest.fn().mockResolvedValue(undefined);
  removeNotification = jest.fn().mockResolvedValue(undefined);
  userCollection = jest.fn((name) => ({
    doc: jest.fn(() => name === 'expenses'
      ? { delete: removeExpense }
      : { delete: removeNotification }),
  }));
  firestore.collection.mockReturnValue({ doc: jest.fn(() => ({ collection: userCollection })) });
});

test('confirmed transaction delete removes the owner-scoped expense and its reminder, not cardStatements', async () => {
  const dispatch = jest.fn();
  await deleteCardAction('expense-a')(dispatch, () => ({ auth: { user: { uid: 'alice' } } }));
  expect(firestore.collection).toHaveBeenCalledWith('users');
  expect(userCollection.mock.calls.map(([name]) => name)).toEqual(['expenses', 'notifications']);
  expect(removeExpense).toHaveBeenCalledTimes(1);
  expect(removeNotification).toHaveBeenCalledTimes(1);
  expect(toast.warn).toHaveBeenCalledTimes(1);
  expect(dispatch).toHaveBeenCalledWith({ type: 'DELETE_DOC', docId: 'expense-a' });
});

test('if a reminder delete fails, the already-deleted movement is not restored', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  removeNotification.mockRejectedValueOnce(new Error('permission-denied'));
  try {
    const dispatch = jest.fn();
    await deleteCardAction('expense-b')(dispatch, () => ({ auth: { user: { uid: 'alice' } } }));
    expect(removeExpense).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Could not remove transaction reminder', expect.any(Error));
    expect(dispatch).toHaveBeenCalledWith({ type: 'DELETE_DOC', docId: 'expense-b' });
  } finally {
    warn.mockRestore();
  }
});

test('failed expense deletion does not run reminder cleanup or report success', async () => {
  removeExpense.mockRejectedValueOnce(new Error('permission-denied'));
  const dispatch = jest.fn();
  await expect(deleteCardAction('expense-c')(dispatch, () => ({ auth: { user: { uid: 'alice' } } })))
    .rejects.toThrow('permission-denied');
  expect(removeNotification).not.toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalledWith({ type: 'DELETE_DOC', docId: 'expense-c' });
});
