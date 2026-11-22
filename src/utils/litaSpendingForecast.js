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
  // "Ingreso divisas" is stored with an explicit USD currencyQuantity and may
  // have an empty ARS amount. It is a USD inflow, but NOT proof of new income:
  // the sender could be another account owned by this same person.
  const usdCurrencyEntries = new Map(monthKeys.map((month) => [month, {
    month, usd: 0, records: 0,
  }]));
  const usdIncomeCurrencyReview = { records: 0, categories: new Set() };
  const unclassifiedCategoryNames = new Set();
  let invalidUsdCurrencyQuantity = 0;
  let unclassifiedCount = 0;
  let ignoredMovements = 0;
  let invalidAmounts = 0;

  for (const item of rows) {
    const selectedDate = String(item?.selectedDate || '');
    const month = selectedDate.slice(0, 7);
    if (!monthKeys.includes(month) || !/^20\d{2}-\d{2}-\d{2}$/.test(selectedDate)) continue;
    const name = normalizeCategoryName(item?.category || '');
    const category = categoriesByName.get(name);

    // This dedicated transaction type captures physical USD quantity, not
    // ordinary ARS income. Record it separately even when amount is blank.
    if (/^ingreso\s+(?:de\s+)?divisas\b/.test(name)) {
      const usd = moneyValue(item?.currencyQuantity);
      ignoredMovements++;
      if (usd === null) { invalidUsdCurrencyQuantity++; continue; }
      const entry = usdCurrencyEntries.get(month);
      entry.usd += usd;
      entry.records++;
      continue;
    }

    // Count internal exchanges, investments and transfers neither as spending
    // nor income, because they can move balances without creating new money.
    if (isInternalMovement(name)) { ignoredMovements++; continue; }
    const value = moneyValue(item?.amount);
    if (value === null) { invalidAmounts++; continue; }
    if (!category || typeof category.isExpense !== 'boolean') {
      unclassifiedCount++;
      if (name) unclassifiedCategoryNames.add(name.slice(0, 50));
      continue;
    }

    // Old transactions lacking a USD snapshot are ARS under LTC's storage
    // contract. Never silently infer USD from today's category currency.
    if (!category.isExpense && category.currency === 'USD' &&
      item?.transactionCurrency !== 'USD') {
      usdIncomeCurrencyReview.records++;
      usdIncomeCurrencyReview.categories.add(name.slice(0, 50));
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
    // Income history is independent: USD salary can be recorded even when
    // there are fewer than three USD expense months. A recorded income is
    // not automatically savings, and unknown expense months are never zero.
    const observedIncome = monthly.filter((row) => row.incomeRecords > 0);
    const independentIncome = weightedMonthly(observedIncome.map((row) => row.income));
    const incomeObserved = {
      observedIncomeMonths: observedIncome.length,
      missingIncomeMonths: monthly.filter((row) => row.incomeRecords === 0).map((row) => row.month),
      totalLastSixMonths: cents(observedIncome.reduce((sum, row) => sum + row.income, 0)),
      baseMonthly: independentIncome?.baseMonthly ?? null,
    };
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
      income: income ? { baseMonthly: income.baseMonthly, observedIncomeMonths: observedIncome.length } : null,
      incomeObserved,
      possibleMonthlySavings: expense && income ? cents(income.baseMonthly - expense.baseMonthly) : null,
      topCategories,
    }];
  }));

  const currencyEntryMonths = Array.from(usdCurrencyEntries.values())
    .filter((entry) => entry.records > 0);
  currencies.USD.registeredCurrencyInflows = {
    source: 'ingreso-divisas',
    classification: 'unverified-income',
    observedMonths: currencyEntryMonths.length,
    totalLastSixMonths: cents(currencyEntryMonths.reduce((sum, entry) => sum + entry.usd, 0)),
    records: currencyEntryMonths.reduce((sum, entry) => sum + entry.records, 0),
    monthly: currencyEntryMonths.map((entry) => ({
      month: entry.month, amountUsd: cents(entry.usd), records: entry.records,
    })),
  };

  return {
    scope: 'spending-forecast',
    asOf: day(today),
    historyFrom: first + '-01',
    historyThrough: day(new Date(today.getFullYear(), today.getMonth(), 0)),
    monthsRequested: 6,
    recordCount: rows.length,
    currencies,
    quality: {
      unclassifiedCount, ignoredMovements, invalidAmounts,
      invalidUsdCurrencyQuantity,
      unclassifiedCategoryNames: [...unclassifiedCategoryNames].slice(0, 5),
      usdIncomeCurrencyReview: {
        records: usdIncomeCurrencyReview.records,
        categories: [...usdIncomeCurrencyReview.categories].slice(0, 5),
      },
    },
    methodology: 'Media ponderada de los últimos tres meses con gastos registrados (pesos 1, 2, 3). Rangos bajo/alto: mínimo y máximo mensual observado. Proyección nominal constante para 1, 3 y 6 meses. No es un intervalo estadístico de confianza.',
    caveats: [
      'Meses sin gastos registrados son desconocidos, nunca gasto cero; menos de 3 meses registrados impide estimar.',
      'El período actual incompleto se excluye. No se modelan inflación, estacionalidad ni cambios futuros de precios.',
      'Se excluyen compra/venta/ingreso de divisas, transferencias y movimientos de inversión; las categorías sin clasificación no se inventan.',
      'Los pagos de resúmenes de tarjetas cuentan solamente cuando están registrados como salida en Transacciones; no se suman compras PDF, consumos manuales ni saldos bancarios.',
      'ARS y USD son independientes; no se aplica cotización implícita ni se presuponen obligaciones futuras.',
      'La brecha de caja en ARS no demuestra déficit patrimonial si existen ingresos o activos en USD. Una venta de divisas es cambio de composición, no ingreso nuevo.',
      'El resumen de ingresos en USD puede mostrarse sin historial de gastos suficiente, pero NO permite concluir cuánto se ahorró en USD.',
      'Ingreso divisas registra una cantidad USD recibida: es una entrada de fondos, no necesariamente sueldo o ingreso económico. Se presenta por separado para evitar doble contabilización.',
      'Una categoría de ingreso hoy configurada en USD no convierte automáticamente en USD una transacción vieja guardada sin transactionCurrency USD.',
    ],
  };
}

export const litaForecastWindow = (today = new Date()) => {
  const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return { from: day(start), to: day(end) };
};
