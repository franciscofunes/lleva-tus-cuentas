import { saveCustomCategory } from './customCategoriesService';
import { firestore } from '../shared/config/firebase/firebase.config';

jest.mock('firebase/compat/app', () => ({
  __esModule: true,
  default: { firestore: { FieldValue: { serverTimestamp: jest.fn(() => 'server-time') } } },
}));
jest.mock('../shared/config/firebase/firebase.config', () => ({
  firestore: { collection: jest.fn() },
}));

const set = jest.fn().mockResolvedValue(undefined);
const doc = jest.fn(() => ({ set }));
const collection = jest.fn(() => ({ doc }));
const customCategories = [{ name: 'Mascotas', isExpense: true }];

beforeEach(() => {
  jest.clearAllMocks();
  firestore.collection.mockReturnValue({ doc: jest.fn(() => ({ collection })) });
});

test('stores the due-date option only in the private user category and uses allowed field', async () => {
  await saveCustomCategory('userA', {
    name: 'Alquiler', isExpense: true, dateBehavior: 'due-date',
  }, customCategories);
  expect(firestore.collection).toHaveBeenCalledWith('users');
  expect(collection).toHaveBeenCalledWith('customCategories');
  expect(set).toHaveBeenCalledWith({
    name: 'Alquiler', isExpense: true, active: true,
    dateBehavior: 'due-date', createdAt: 'server-time', updatedAt: 'server-time',
  });
});

test('existing categories without a due-date flag keep their original payload', async () => {
  await saveCustomCategory('userA', { name: 'Papelería', isExpense: true }, customCategories);
  const payload = set.mock.calls[0][0];
  expect(payload.dateBehavior).toBeUndefined();
});

test('rejects arbitrary date behavior before writing to Firestore', async () => {
  await expect(saveCustomCategory('userA', {
    name: 'Alquiler', isExpense: true, dateBehavior: 'date-of-purchase',
  }, customCategories)).rejects.toThrow(/vencimiento/);
  expect(set).not.toHaveBeenCalled();
});
