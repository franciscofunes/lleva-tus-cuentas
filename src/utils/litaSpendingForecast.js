import { getTransactionCurrency, normalizeCategoryName } from './customCategories';

const cents = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const moneyValue = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};
const day = (date) => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');
const keyOf = (date) => day(date).slice(0, 7);
const isInternalMovement = (name) =>
  /(?:compra|venta|ingreso)\s+(?:de\s+)?divisas|transferenc|traspaso|entre\s+cuentas|inversi[oó]n|aportes?|rescates?|retiros?|extracci[oó]n/i.test(name);

const weightedMonthly = (values) => {
  if (values.length < 3) return null;
  const lastThree = values.slice(-3);
  const weights = [1, 2, 3].slice(-lastThree.length);
  const base = cents(lastThree.reduce((sum, value, index) => sum + value * weights[index], 0) /
    weights.reduce((sum, value) => sum + value, 0));
  return {
    lowMonthly: cents(Math.min(...values)),
    baseMonthly: base,
    highMonthly: cents(Math.max(...values)),
    historyAverage: cents(values.reduce((sum, value) => sum + value, 0) / values.length),
    scenarios: [1, 3, 6].map((months) => ({
      months,
      low: cents(Math.min(...values) * months),
      base: cents(base * months),
      high: cents(Math.max(...values) * months),
    })),
  };
};

/**
 * Deterministic read-only forecast from six fully elapsed calendar months.
 * Missing months are UNKNOWN (never 0). The figures are nominal extrapolations,
 * not probabilities, financial advice, or predicted credit-card obligations.
 * Rows come exclusively from the authenticated user's expenses collection.
 */
export function buildLitaSpendingForecast(rows = [], categories = [], today = new Date()) {
  const monthKeys = Array.from({ length: 6 }, (_, i) =>
    keyOf(new Date(today.getFullYear(), today.getMonth() - 6 + i, 1)));
  const first = monthKeys[0];
  const last = monthKeys[5];
  const categoriesByName = new Map((categories || [])
    .filter((category) => typeof category?.name === 'string')
    .map((category) => [normalizeCategoryName(category.name), category]));
  const byCurrency = Object.fromEntries(['ARS', 'USD'].map((currency) => [
    currency, new Map(monthKeys.map((month) => [month, {
      month, expense: 0, income: 0, expenseRecords: 0, incomeRecords: 0,
    }])),
  ]));
  const categorySpend = { ARS: new Map(), USD: new Map() };
  const categoryMonthly = { ARS: new Map(), USD: new Map() };
  let unclassifiedCount = 0;
  let ignoredMovements = 0;
  let invalidAmounts = 0;

  for (const item of rows) {
    const selectedDate = String(item?.selectedDate || '');
    const month = selectedDate.slice(0, 7);
    if (!monthKeys.includes(month) || !/^20\d{2}-\d{2}-\d{2}$/.test(selectedDate)) continue;
    const value = moneyValue(item?.amount);
    if (value === null) { invalidAmounts++; continue; }
    const name = normalizeCategoryName(item?.category || '');
    const category = categoriesByName.get(name);
    if (isInternalMovement(name)) { ignoredMovements++; continue; }
    if (!category || typeof category.isExpense !== 'boolean') {
      unclassifiedCount++;
      continue;
    }
    const currency = getTransactionCurrency(item);
    const row = byCurrency[currency].get(month);
    if (category.isExpense) {
      row.expense += value;
      row.expenseRecords++;
      categorySpend[currency].set(category.name, (categorySpend[currency].get(category.name) || 0) + value);
      const byMonth = categoryMonthly[currency].get(category.name) || new Map();
      byMonth.set(month, (byMonth.get(month) || 0) + value);
      categoryMonthly[currency].set(category.name, byMonth);
    } else {
      row.income += value;
      row.incomeRecords++;
    }
  }

  const currencies = Object.fromEntries(['ARS', 'USD'].map((currency) => {
    const monthly = Array.from(byCurrency[currency].values()).map((row) => ({
      month: row.month, expense: cents(row.expense), income: cents(row.income),
      expenseRecords: row.expenseRecords, incomeRecords: row.incomeRecords,
      hasExpenseData: row.expenseRecords > 0,
    }));
    const observed = monthly.filter((row) => row.hasExpenseData);
    const expense = weightedMonthly(observed.map((row) => row.expense));
    // Savings must compare income and expense from the SAME three months.
    const matchedMonths = observed.slice(-3);
    const hasMatchingIncome = matchedMonths.length === 3 &&
      matchedMonths.every((row) => row.incomeRecords > 0);
    const income = hasMatchingIncome
      ? weightedMonthly(matchedMonths.map((row) => row.income))
      : null;
    const recentExpenseMonths = observed.slice(-3).map((row) => row.month);
    const topCategories = [...categorySpend[currency].entries()]
      .map(([category, amount]) => {
        const lastThree = recentExpenseMonths.map((month) =>
          categoryMonthly[currency].get(category)?.get(month) || 0);
        return {
          category,
          totalLastSixMonths: cents(amount),
          // Categories absent from a documented expense month count as zero
          // within that observed month, not as a missing month.
          projectedMonthly: expense ? weightedMonthly(lastThree)?.baseMonthly ?? null : null,
        };
      })
      .sort((a, b) => (b.projectedMonthly ?? b.totalLastSixMonths) -
        (a.projectedMonthly ?? a.totalLastSixMonths))
      .slice(0, 5);
    return [currency, {
      currency,
      status: expense ? (observed.length === 6 ? 'ok' : 'partial-history') : 'insufficient-data',
      observedExpenseMonths: observed.length,
      missingExpenseMonths: monthly.filter((row) => !row.hasExpenseData).map((row) => row.month),
      monthly,
      expense,
      income: income ? { baseMonthly: income.baseMonthly, observedIncomeMonths: monthly.filter((row) => row.incomeRecords > 0).length } : null,
      possibleMonthlySavings: expense && income ? cents(income.baseMonthly - expense.baseMonthly) : null,
      topCategories,
    }];
  }));

  return {
    scope: 'spending-forecast',
    asOf: day(today),
    historyFrom: first + '-01',
    historyThrough: day(new Date(today.getFullYear(), today.getMonth(), 0)),
    monthsRequested: 6,
    recordCount: rows.length,
    currencies,
    quality: { unclassifiedCount, ignoredMovements, invalidAmounts },
    methodology: 'Media ponderada de los últimos tres meses con gastos registrados (pesos 1, 2, 3). Rangos bajo/alto: mínimo y máximo mensual observado. Proyección nominal constante para 1, 3 y 6 meses. No es un intervalo estadístico de confianza.',
    caveats: [
      'Meses sin gastos registrados son desconocidos, nunca gasto cero; menos de 3 meses registrados impide estimar.',
      'El período actual incompleto se excluye. No se modelan inflación, estacionalidad ni cambios futuros de precios.',
      'Se excluyen compra/venta/ingreso de divisas, transferencias y movimientos de inversión; las categorías sin clasificación no se inventan.',
      'Los pagos de resúmenes de tarjetas cuentan solamente cuando están registrados como salida en Transacciones; no se suman compras PDF, consumos manuales ni saldos bancarios.',
      'ARS y USD son independientes; no se aplica cotización implícita ni se presuponen obligaciones futuras.',
    ],
  };
}

export const litaForecastWindow = (today = new Date()) => {
  const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return { from: day(start), to: day(end) };
};
