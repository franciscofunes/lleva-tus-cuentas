import {
  categoryDocumentId, normalizeCategoryName, validateCustomCategory,
  mergeCategories, categoriesForNewTransactions,
} from './customCategories';

const shared = [
  { id: 'bank', name: 'Resumen tarjeta 💳', isExpense: true },
  { id: 'food', name: 'Alimentación 🍜', isExpense: true },
  { id: 'salary', name: 'Sueldo', isExpense: false },
];
const mine = [
  { id: 'pets', name: 'Mascotas', isExpense: true, active: true },
  { id: 'freelance', name: 'Freelance', isExpense: false, active: true },
  { id: 'archive', name: 'Educación', isExpense: true, active: false },
];

test('merge retains general catalog and each private category without overwriting global types', () => {
  const merged = mergeCategories(shared, mine);
  expect(merged).toHaveLength(6);
  expect(merged.find((entry) => entry.name === 'Resumen tarjeta 💳').origin).toBe('shared');
  expect(merged.find((entry) => entry.name === 'Mascotas')).toMatchObject({ isCustom: true, isExpense: true });
  expect(merged.find((entry) => entry.name === 'Freelance').isExpense).toBe(false);
  expect(merged.find((entry) => entry.name === 'Educación').active).toBe(false);
});

test('duplicates never shadow a system category even with different case or accents', () => {
  expect(normalizeCategoryName('  Alimentación    ')).toBe('alimentacion');
  const merged = mergeCategories(shared, [{ id: 'fake', name: 'alimentación 🍜', isExpense: false }]);
  expect(merged).toHaveLength(shared.length);
  expect(merged.find((entry) => entry.id === 'food').isExpense).toBe(true);
  expect(validateCustomCategory({ name: 'ALIMENTACION 🍜', isExpense: false }, shared)).toMatch(/existe/);
});

test('system-special category words are reserved, while custom income and expenses are allowed', () => {
  for (const name of ['Resumen tarjeta local', 'Venta divisas adicional', 'Ingreso divisas banco']) {
    expect(validateCustomCategory({ name, isExpense: true }, shared)).toMatch(/reservado/);
  }
  expect(validateCustomCategory({ name: 'Mascotas', isExpense: true }, shared)).toBeNull();
  expect(validateCustomCategory({ name: 'Consultoría', isExpense: false }, shared)).toBeNull();
  expect(validateCustomCategory({ name: 'X', isExpense: true }, shared)).toMatch(/entre 2 y 50/);
});

test('category IDs are stable, do not disclose user IDs, and remain within security rules', () => {
  const id = categoryDocumentId('Mascotas 🐈');
  expect(id).toMatch(/^[a-z0-9-]{3,80}$/);
  expect(id).toBe(categoryDocumentId('mascotas 🐈'));
  expect(id).not.toBe(categoryDocumentId('Mascotas 🐕'));
});

test('archiving removes only new form options; old transactions keep their category', () => {
  const merged = mergeCategories(shared, mine);
  expect(categoriesForNewTransactions(merged).some((entry) => entry.name === 'Educación')).toBe(false);
  expect(categoriesForNewTransactions(merged, 'Educación').some((entry) => entry.name === 'Educación')).toBe(true);
  expect(categoriesForNewTransactions(merged).some((entry) => entry.name === 'Mascotas')).toBe(true);
});
