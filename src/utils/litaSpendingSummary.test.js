import { summarizeSpendingByCategory } from './litaSpendingSummary';

describe('expense aggregates for LITA', () => {
  const categories = [
    { name: 'Resumen tarjeta', isExpense: true },
    { name: 'Alimentos', isExpense: true },
    { name: 'Sueldo', isExpense: false },
  ];

  it('uses the current-view rows and ranks expense amounts without incomes', () => {
    const totals = summarizeSpendingByCategory([
      { category: 'Alimentos', amount: 30.25 },
      { category: 'Resumen tarjeta', amount: 120.40 },
      { category: 'Alimentos', amount: 20 },
      { category: 'Sueldo', amount: 3000 },
    ], categories);
    expect(totals.totalArs).toBe(170.65);
    expect(totals.currency).toBe('ARS');
    expect(totals.categories[0]).toEqual(expect.objectContaining({
      category: 'Resumen tarjeta',
      totalArs: 120.4,
      transactionCount: 1,
    }));
    expect(totals.categories[1].totalArs).toBe(50.25);
  });

  it('does not invent totals for blank, missing or invalid amounts', () => {
    const totals = summarizeSpendingByCategory([
      { category: 'Alimentos', amount: '' },
      { category: 'Alimentos', amount: null },
      { category: 'Alimentos', amount: -10 },
      { category: 'Alimentos', amount: 'unknown' },
      { category: 'Alimentos', amount: 0 },
    ], categories);
    expect(totals.totalArs).toBe(0);
    expect(totals.categories).toEqual([]);
    expect(totals.invalidAmountCount).toBe(5);
  });
});

test('ARS and USD expenses are distinct category aggregations without guessed FX', () => {
  const cats = [{name:'Suscripción',isExpense:true,currency:'USD'}];
  const result = summarizeSpendingByCategory([
    {category:'Suscripción',amount:1499}, // legacy ARS
    {category:'Suscripción',amount:19.99,transactionCurrency:'USD'},
    {category:'Suscripción',amount:15,transactionCurrency:'USD'},
  ],cats);
  expect(result.totalArs).toBe(1499);
  expect(result.totalUsd).toBe(34.99);
  expect(result.categories[0].totalArs).toBe(1499);
  expect(result.categoriesUsd[0].totalUsd).toBe(34.99);
});
