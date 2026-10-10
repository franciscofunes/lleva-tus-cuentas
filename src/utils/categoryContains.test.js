import { categoryContains } from './categoryContains';

test('missing, null and corrupt categories cannot break financial dashboard summaries', () => {
  expect(categoryContains({}, 'Venta divisas')).toBe(false);
  expect(categoryContains({ category: null }, 'Venta divisas')).toBe(false);
  expect(categoryContains({ category: 10 }, 'Venta divisas')).toBe(false);
  expect(categoryContains({ category: {} }, 'Compra divisas')).toBe(false);
  expect(categoryContains({ category: 'Venta divisas' }, 'Venta divisas')).toBe(true);
  expect(categoryContains({ category: 'Compra divisas' }, 'Compra divisas')).toBe(true);
  expect(categoryContains({ category: 'Ingreso divisas' }, 'Venta divisas')).toBe(false);
});
