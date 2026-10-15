import { firestore } from '../shared/config/firebase/firebase.config';
import { updateDataAction } from './databaseActions';

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
  expect(saved.customDetails).toEqual({});
});

test('only approved nonempty metadata keys are written on existing transaction edits', async () => {
  await updateDataAction({ ...base, customDetails: { paymentMethod: 'debito', reference: ' A-23 ' } }, 'expense-1')(jest.fn());
  const saved = update.mock.calls[0][0];
  expect(saved.customDetails).toEqual({ paymentMethod: 'debito', reference: 'A-23' });
  expect(saved.amount).toBe('2500');
});

test('a credit-card summary with ARS 0 keeps the exact zero amount instead of leaving stale expense values', async () => {
  await updateDataAction({ ...base, amount: 0, category: 'Resumen tarjeta 💳' }, 'expense-1')(jest.fn());
  const saved = update.mock.calls[0][0];
  expect(saved.amount).toBe(0);
  expect(saved.category).toBe('Resumen tarjeta 💳');
});

test('editing Hogar clears the old due date and removes its notification when user empties the optional field', async () => {
  await updateDataAction({
    ...base, name: 'GarboSSA', category: 'Hogar 🏡',
    selectedExpirationDate: '', dueDate: null, notificationEnabled: false,
  }, 'expense-home')(jest.fn());
  const saved = update.mock.calls[0][0];
  expect(saved.category).toBe('Hogar 🏡');
  expect(saved.selectedDate).toBe('2026-10-10');
  expect(saved.dueDate).toBeNull();
  expect(saved.notificationEnabled).toBe(false);
  expect(saved).toHaveProperty('selectedExpirationDate');
  expect(typeof saved.selectedExpirationDate.isEqual).toBe('function');
  expect(removeReminder).toHaveBeenCalledTimes(1);
});

test('editing Hogar with a due date retains that exact date and marks reminder as enabled', async () => {
  await updateDataAction({
    ...base, category: 'Hogar 🏡', selectedExpirationDate: '2026-10-21',
    dueDate: '2026-10-21', notificationEnabled: true,
  }, 'expense-home')(jest.fn());
  const saved = update.mock.calls[0][0];
  expect(saved.selectedExpirationDate).toBe('2026-10-21');
  expect(saved.dueDate).toBe('2026-10-21');
  expect(saved.notificationEnabled).toBe(true);
  expect(removeReminder).not.toHaveBeenCalled();
});
