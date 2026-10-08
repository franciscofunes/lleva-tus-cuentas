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
