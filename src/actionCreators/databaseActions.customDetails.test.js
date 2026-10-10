import firebase from 'firebase/compat/app';
import { firestore } from '../shared/config/firebase/firebase.config';
import { updateDataAction } from './databaseActions';

jest.mock('firebase/compat/app', () => ({
  __esModule: true,
  default: { firestore: { FieldValue: { delete: jest.fn(() => 'FIRESTORE_FIELD_DELETE') } } },
}));
jest.mock('../shared/config/firebase/firebase.config', () => ({
  firestore: { collection: jest.fn() },
}));
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const update = jest.fn().mockResolvedValue(undefined);
const removeReminder = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  firestore.collection.mockImplementation(() => ({
    doc: () => ({
      collection: (name) => ({
        doc: () => name === 'expenses'
          ? { update }
          : { delete: removeReminder },
      }),
    }),
  }));
});

const base = {
  userId: 'owner-1', name: 'Viaje', category: 'Transporte 🚌',
  selectedDate: '2026-10-10', comment: 'Taxi', amount: '2500',
  notificationEnabled: false,
};

test('legacy transaction updates do not add an empty customDetails field', async () => {
  await updateDataAction({ ...base, customDetails: {}, clearCustomDetails: false }, 'expense-1')(jest.fn());
  const saved = update.mock.calls[0][0];
  expect(saved).not.toHaveProperty('customDetails');
  expect(saved.category).toBe('Transporte 🚌');
  expect(saved.amount).toBe('2500');
});

test('a category change explicitly clears previously saved custom metadata', async () => {
  await updateDataAction({ ...base, customDetails: {}, clearCustomDetails: true }, 'expense-1')(jest.fn());
  const saved = update.mock.calls[0][0];
  expect(saved.customDetails).toBe('FIRESTORE_FIELD_DELETE');
  expect(firebase.firestore.FieldValue.delete).toHaveBeenCalledTimes(1);
});

test('only approved nonempty metadata keys are written on existing transaction edits', async () => {
  await updateDataAction({ ...base, customDetails: { paymentMethod: 'debito', reference: ' A-23 ' } }, 'expense-1')(jest.fn());
  const saved = update.mock.calls[0][0];
  expect(saved.customDetails).toEqual({ paymentMethod: 'debito', reference: 'A-23' });
  expect(saved.amount).toBe('2500');
});
