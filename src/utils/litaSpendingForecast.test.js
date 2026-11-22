import { buildLitaSpendingForecast, litaForecastWindow } from './litaSpendingForecast';

const today = new Date(2026, 10, 21);
const categories = [
  { name: 'Alimentos', isExpense: true },
  { name: 'Servicios', isExpense: true, active: false },
  { name: 'Sueldo', isExpense: false },
  { name: 'Resumen tarjeta', isExpense: true },
];
const row = (date, category, amount, transactionCurrency = 'ARS') => ({
  selectedDate: date, category, amount, transactionCurrency,
});

test('forecasts only fully finished months by currency without adding currency sales or current month', () => {
  const rows = [
    row('2026-08-03', 'Alimentos', 100),
    row('2026-09-03', 'Alimentos', 200),
    row('2026-10-03', 'Servicios', 300),
    row('2026-08-06', 'Alimentos', 20, 'USD'),
    row('2026-09-06', 'Alimentos', 30, 'USD'),
    row('2026-10-06', 'Alimentos', 40, 'USD'),
    row('2026-08-02', 'Sueldo', 500),
    row('2026-09-02', 'Sueldo', 600),
    row('2026-10-02', 'Sueldo', 700),
    row('2026-10-08', 'Venta divisas', 500000),
    row('2026-10-09', 'Transferencia entre cuentas', 200000),
    row('2026-10-10', 'Categoría desconocida', 999),
    row('2026-11-01', 'Alimentos', 999999),
    row('2026-10-17', 'Alimentos', 'mal'),
  ];
  const data = buildLitaSpendingForecast(rows, categories, today);
  expect(litaForecastWindow(today)).toEqual({ from: '2026-05-01', to: '2026-10-31' });
  expect(data.currencies.ARS.status).toBe('partial-history');
  expect(data.currencies.ARS.observedExpenseMonths).toBe(3);
  expect(data.currencies.ARS.missingExpenseMonths).toEqual(['2026-05', '2026-06', '2026-07']);
  expect(data.currencies.ARS.expense).toMatchObject({
    lowMonthly: 100, baseMonthly: 233.33, highMonthly: 300,
  });
  expect(data.currencies.ARS.expense.scenarios.find(x => x.months === 3).base).toBe(699.99);
  expect(data.currencies.ARS.income.baseMonthly).toBe(633.33);
  expect(data.currencies.ARS.possibleMonthlySavings).toBe(400);
  expect(data.currencies.USD.expense.baseMonthly).toBe(33.33);
  expect(data.currencies.USD.expense.scenarios.find(x => x.months === 6).base).toBe(199.98);
  expect(data.currencies.ARS.topCategories.find(x => x.category === 'Servicios').totalLastSixMonths).toBe(300);
  expect(data.currencies.ARS.topCategories[0]).toMatchObject({category:'Servicios',projectedMonthly:150});
  expect(data.currencies.ARS.topCategories.find(x => x.category === 'Alimentos').projectedMonthly).toBe(83.33);
  expect(data.quality).toMatchObject({ ignoredMovements: 2, unclassifiedCount: 1, invalidAmounts: 1 });
});

test('no prediction from fewer than three recorded expense months', () => {
  const data = buildLitaSpendingForecast([
    row('2026-09-10', 'Resumen tarjeta', 4000),
    row('2026-10-11', 'Resumen tarjeta', 6000),
  ], categories, today);
  expect(data.currencies.ARS.status).toBe('insufficient-data');
  expect(data.currencies.ARS.expense).toBeNull();
  expect(data.currencies.USD.expense).toBeNull();
  expect(data.quality.unclassifiedCount).toBe(0);
});

test('does not treat missing months as zero or turn legacy ARS into USD', () => {
  const data = buildLitaSpendingForecast([
    { selectedDate:'2026-08-01', category:'Alimentos', amount:70 },
    { selectedDate:'2026-09-01', category:'Alimentos', amount:70 },
    { selectedDate:'2026-10-01', category:'Alimentos', amount:70 },
  ], categories, today);
  expect(data.currencies.ARS.expense.baseMonthly).toBe(70);
  expect(data.currencies.USD.expense).toBeNull();
  expect(data.currencies.ARS.missingExpenseMonths).toHaveLength(3);
});

test('does not infer savings from disjoint salary months or treat investments as consumption', () => {
  const data = buildLitaSpendingForecast([
    row('2026-08-01', 'Alimentos', 100),
    row('2026-09-01', 'Alimentos', 100),
    row('2026-10-01', 'Alimentos', 100),
    row('2026-05-10', 'Sueldo', 900),
    row('2026-06-10', 'Sueldo', 900),
    row('2026-07-10', 'Sueldo', 900),
    row('2026-10-12', 'Aporte inversión', 15000),
  ], categories, today);
  expect(data.currencies.ARS.expense.baseMonthly).toBe(100);
  expect(data.currencies.ARS.possibleMonthlySavings).toBeNull();
  expect(data.quality.ignoredMovements).toBe(1);
});


test('USD income can be observed independently with no three USD expense months', () => {
  const data = buildLitaSpendingForecast([
    row('2026-08-04', 'Sueldo', 5000, 'USD'),
    row('2026-09-04', 'Sueldo', 5500, 'USD'),
    row('2026-10-04', 'Sueldo', 5500, 'USD'),
    row('2026-08-03', 'Alimentos', 100000),
    row('2026-09-03', 'Alimentos', 150000),
    row('2026-10-03', 'Alimentos', 200000),
    row('2026-08-09', 'Venta divisas', 3000000),
    row('2026-09-09', 'Compra divisas', 3000000),
  ], categories, today);
  expect(data.currencies.ARS.expense.baseMonthly).toBe(166666.67);
  expect(data.currencies.USD.status).toBe('insufficient-data');
  expect(data.currencies.USD.expense).toBeNull();
  expect(data.currencies.USD.income).toBeNull();
  expect(data.currencies.USD.possibleMonthlySavings).toBeNull();
  expect(data.currencies.USD.incomeObserved).toEqual({
    observedIncomeMonths: 3,
    missingIncomeMonths: ['2026-05', '2026-06', '2026-07'],
    totalLastSixMonths: 16000,
    baseMonthly: 5416.67,
  });
  expect(data.currencies.ARS.incomeObserved.observedIncomeMonths).toBe(0);
  expect(data.quality.ignoredMovements).toBe(2);
});

test('one observed USD salary month reports history but never invents a monthly salary', () => {
  const data = buildLitaSpendingForecast([
    row('2026-10-05', 'Sueldo', 7000, 'USD'),
    row('2026-08-08', 'Alimentos', 100),
    row('2026-09-08', 'Alimentos', 100),
    row('2026-10-08', 'Alimentos', 100),
  ], categories, today);
  expect(data.currencies.USD.incomeObserved.totalLastSixMonths).toBe(7000);
  expect(data.currencies.USD.incomeObserved.observedIncomeMonths).toBe(1);
  expect(data.currencies.USD.incomeObserved.baseMonthly).toBeNull();
  expect(data.currencies.USD.possibleMonthlySavings).toBeNull();
});

test('Ingreso divisas is visible as recorded USD inflow even with empty ARS amount', () => {
  const data = buildLitaSpendingForecast([
    { selectedDate: '2026-08-09', category: 'Ingreso divisas', amount: '', currencyQuantity: 4000, transactionCurrency: 'ARS' },
    { selectedDate: '2026-09-09', category: 'Ingreso divisas', currencyQuantity: 5500, transactionCurrency: 'ARS' },
    { selectedDate: '2026-10-09', category: 'Ingreso divisas', amount: null, currencyQuantity: '5.500', transactionCurrency: 'ARS' },
    row('2026-08-04', 'Alimentos', 500),
    row('2026-09-04', 'Alimentos', 500),
    row('2026-10-04', 'Alimentos', 500),
  ], categories, today);
  expect(data.currencies.USD.registeredCurrencyInflows).toMatchObject({
    source: 'ingreso-divisas', classification: 'unverified-income',
    observedMonths: 3, totalLastSixMonths: 9505.5, records: 3,
  });
  expect(data.currencies.USD.incomeObserved.observedIncomeMonths).toBe(0);
  expect(data.currencies.USD.possibleMonthlySavings).toBeNull();
  expect(data.currencies.ARS.incomeObserved.observedIncomeMonths).toBe(0);
  expect(data.quality.invalidAmounts).toBe(0);
  expect(data.quality.ignoredMovements).toBe(3);
});

test('FX purchases and sales are not economic income or USD incoming deposits', () => {
  const data = buildLitaSpendingForecast([
    { selectedDate: '2026-08-10', category: 'Compra divisas', amount: 200000, currencyQuantity: 1000 },
    { selectedDate: '2026-09-10', category: 'Venta divisas', amount: 250000, currencyQuantity: 1200 },
    { selectedDate: '2026-10-10', category: 'Ingreso divisas', amount: '', currencyQuantity: '' },
  ], categories, today);
  expect(data.currencies.USD.registeredCurrencyInflows.records).toBe(0);
  expect(data.quality.invalidUsdCurrencyQuantity).toBe(1);
  expect(data.quality.ignoredMovements).toBe(3);
  expect(data.currencies.USD.incomeObserved.observedIncomeMonths).toBe(0);
  expect(data.currencies.ARS.incomeObserved.observedIncomeMonths).toBe(0);
});

test('separate actual USD salary from incoming transfer and from legacy ARS snapshot', () => {
  const categoryMetadata = [...categories, { name: 'Honorarios exterior', isExpense: false, currency: 'USD' }];
  const data = buildLitaSpendingForecast([
    row('2026-08-04', 'Honorarios exterior', 5500, 'USD'),
    row('2026-09-04', 'Honorarios exterior', 5500, 'USD'),
    row('2026-10-04', 'Honorarios exterior', 5500, 'USD'),
    row('2026-08-05', 'Honorarios exterior', 45000), // Explicitly ARS: no inference
    { selectedDate: '2026-09-06', category: 'Honorarios exterior', amount: 68000 }, // Legacy ARS
    { selectedDate: '2026-10-07', category: 'Ingreso divisas', currencyQuantity: 5500 },
  ], categoryMetadata, today);
  expect(data.currencies.USD.incomeObserved).toMatchObject({
    observedIncomeMonths: 3, totalLastSixMonths: 16500, baseMonthly: 5500,
  });
  expect(data.currencies.USD.registeredCurrencyInflows.totalLastSixMonths).toBe(5500);
  expect(data.quality.usdIncomeCurrencyReview).toMatchObject({
    records: 2, categories: ['honorarios exterior'],
  });
  expect(data.currencies.ARS.incomeObserved.observedIncomeMonths).toBe(2);
  expect(data.currencies.ARS.incomeObserved.totalLastSixMonths).toBe(113000);
  expect(data.currencies.USD.possibleMonthlySavings).toBeNull();
});
