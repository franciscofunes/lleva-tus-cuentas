import { summarizeBimonetaryFlows, sumPortfolioCurrencies } from './bimonetarySummary';

const categories = [
  { name: 'Alquiler', isExpense: true },
  { name: 'Sueldo ARS', isExpense: false },
  { name: 'Ingreso divisas', isExpense: false },
  { name: 'Venta divisas', isExpense: false },
  { name: 'Compra divisas', isExpense: true },
];

describe('bimonetary summary: transfers do not become income or consumption', () => {
  it('keeps USD earnings independent from ARS sales, purchases and expenses', () => {
    const summary = summarizeBimonetaryFlows([
      { category: 'Ingreso divisas', currencyQuantity: 1500 },
      { category: 'Venta divisas', currencyQuantity: 800, amount: 1200000 },
      { category: 'Compra divisas', currencyQuantity: 100, amount: 150000 },
      { category: 'Sueldo ARS', amount: 100000 },
      { category: 'Alquiler', amount: 500000 },
    ], categories);

    expect(summary.earnedUsd).toBe(1500);
    expect(summary.soldUsd).toBe(800);
    expect(summary.purchasedUsd).toBe(100);
    expect(summary.knownUsdMovement).toBe(800);
    expect(summary.earnedArs).toBe(100000);
    expect(summary.spentArs).toBe(500000);
    expect(summary.fromUsdSalesArs).toBe(1200000);
    expect(summary.spentOnUsdPurchasesArs).toBe(150000);
    expect(summary.knownArsNet).toBe(650000);
  });

  it('does not mislabel conversion proceeds as an earned income or lose negative ARS flow context', () => {
    const summary = summarizeBimonetaryFlows([
      { category: 'Ingreso divisas', currencyQuantity: 2000 },
      { category: 'Alquiler', amount: 90000 },
    ], categories);
    expect(summary.earnedUsd).toBe(2000);
    expect(summary.earnedArs).toBe(0);
    expect(summary.knownArsNet).toBe(-90000);
  });

  it('flags incomplete values without inventing prices or arbitrary exchange rates', () => {
    const summary = summarizeBimonetaryFlows([
      { category: 'Ingreso divisas', currencyQuantity: '' },
      { category: 'Venta divisas', currencyQuantity: 200, amount: null },
      { category: 'Alquiler', amount: 'not a number' },
    ], categories);
    expect(summary.missingUsdCount).toBe(1);
    expect(summary.unexplainedArsCount).toBe(2);
    expect(summary.knownArsNet).toBe(0);
  });

  it('uses current portfolio positions by currency, not historical transactions', () => {
    expect(sumPortfolioCurrencies([
      { currency: 'USD', balance: 1200.25 },
      { currency: 'USD', balance: 1800 },
      { currency: 'ARS', balance: 100000 },
      { currency: 'EUR', balance: 500 },
      { currency: 'USD', balance: 'invalid' },
    ])).toEqual({ USD: 3000.25, ARS: 100000, positions: 3 });
  });
});
