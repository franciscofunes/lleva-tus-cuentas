import { categoryContains } from './categoryContains';

test('incomplete historical transaction categories never crash financial summaries', () => {
  expect(categoryContains({}, 'Compra divisas')).toBe(false);
  expect(categoryContains({ category: undefined }, 'Venta divisas')).toBe(false);
  expect(categoryContains({ category: null }, 'Venta divisas')).toBe(false);
  expect(categoryContains({ category: 123 }, 'Compra divisas')).toBe(false);
  expect(categoryContains({ category: 'Compra divisas 💵' }, 'Compra divisas')).toBe(true);
  expect(categoryContains({ category: 'Venta divisas' }, 'Venta divisas')).toBe(true);
});
