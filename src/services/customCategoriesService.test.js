import { saveCustomCategory, updateCustomCategoryLabel } from './customCategoriesService';
import firebase from 'firebase/compat/app';
import { firestore } from '../shared/config/firebase/firebase.config';

jest.mock('firebase/compat/app', () => ({
  __esModule: true,
  default: { firestore: { FieldValue: { serverTimestamp: jest.fn(() => 'server-time') } } },
}));
jest.mock('../shared/config/firebase/firebase.config', () => ({
  firestore: { collection: jest.fn() },
}));

const set = jest.fn().mockResolvedValue(undefined);
const update = jest.fn().mockResolvedValue(undefined);
const doc = jest.fn(() => ({ set, update }));
const collection = jest.fn(() => ({ doc }));
const customCategories = [{ name: 'Mascotas', isExpense: true }];

beforeEach(() => {
  jest.clearAllMocks();
  // CRA/Jest may reset mocks between suites. Restore every link in the
  // Firestore collection -> user document -> category collection -> doc chain.
  set.mockResolvedValue(undefined);
  update.mockResolvedValue(undefined);
  firebase.firestore.FieldValue.serverTimestamp.mockReturnValue('server-time');
  doc.mockImplementation(() => ({ set, update }));
  collection.mockImplementation(() => ({ doc }));
  firestore.collection.mockImplementation(() => ({
    doc: jest.fn(() => ({ collection })),
  }));
});

test('stores the due-date option only in the private user category and uses allowed field', async () => {
  await saveCustomCategory('userA', {
    name: 'Alquiler', isExpense: true, dateBehavior: 'separate-due-date',
  }, customCategories);
  expect(firestore.collection).toHaveBeenCalledWith('users');
  expect(collection).toHaveBeenCalledWith('customCategories');
  expect(set).toHaveBeenCalledWith({
    name: 'Alquiler', isExpense: true, active: true,
    dateBehavior: 'separate-due-date', createdAt: 'server-time', updatedAt: 'server-time',
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

test('legacy due-date category configuration remains accepted without rewriting historical behavior', async () => {
  await saveCustomCategory('userA', {
    name: 'Servicio anterior', isExpense: true, dateBehavior: 'due-date',
  }, customCategories);
  expect(set.mock.calls[0][0].dateBehavior).toBe('due-date');
});

test('renaming updates ONLY displayName and timestamp under this owner, not canonical key', async () => {
  const entry = {
    id: 'pets-id', name: 'Mascotas', origin: 'custom',
    isCustom: true, isExpense: true, active: true,
  };
  const all = [entry, { id: 'shared', name: 'Sueldo', isExpense: false, origin: 'shared' }];
  const renamed = await updateCustomCategoryLabel('userA', entry, '  Animales   domésticos  ', all);
  expect(renamed).toBe('Animales domésticos');
  expect(firestore.collection).toHaveBeenCalledWith('users');
  expect(collection).toHaveBeenCalledWith('customCategories');
  expect(doc).toHaveBeenCalledWith('pets-id');
  expect(update).toHaveBeenCalledWith({displayName:'Animales domésticos',updatedAt:'server-time'});
  expect(update.mock.calls[0][0].name).toBeUndefined();
  expect(update.mock.calls[0][0].isExpense).toBeUndefined();
});

test('refuses to rename a shared category, a duplicate label, or an unauthenticated user', async () => {
  const own={id:'pets',name:'Mascotas',isCustom:true,origin:'custom'};
  const shared={id:'food',name:'Alimentación',origin:'shared',isCustom:false};
  await expect(updateCustomCategoryLabel('userA',shared,'Comida',[own,shared]))
    .rejects.toThrow(/personales/);
  await expect(updateCustomCategoryLabel('userA',own,'Alimentación',[own,shared]))
    .rejects.toThrow(/existe/);
  await expect(updateCustomCategoryLabel('',own,'Cuidado animal',[own,shared]))
    .rejects.toThrow(/personales/);
  expect(update).not.toHaveBeenCalled();
});
