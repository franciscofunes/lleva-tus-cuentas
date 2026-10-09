import { firestore } from '../shared/config/firebase/firebase.config';

const MAX_HISTORY_ROWS = 1200;
const isValidDay = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const asNumber = (input) => {
  if (input === null || input === undefined || input === '') return null;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
};
const toCents = (n) => Math.round(n * 100) / 100;

/** Validated, user-scoped, read-only financial analysis.
 * Does not touch Redux Dashboard data or change the selected period.
 * The client Firestore SDK uses LTC's authenticated user and security rules.
 */
export async function queryLitaHistoricalTransactions({ userId, from, to }, categories = []) {
  if (!userId || !isValidDay(from) || !isValidDay(to) || from > to) {
    throw new Error('Período no válido.');
  }
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  if ((end - start) / 86400000 > 367 || start.getUTCFullYear() < 2000 ||
      end > new Date(Date.now() + 86400000)) {
    throw new Error('Consultá un período anterior de hasta 12 meses.');
  }

  const snapshot = await firestore.collection('users').doc(userId)
    .collection('expenses')
    .where('selectedDate', '>=', from)
    .where('selectedDate', '<=', to)
    .orderBy('selectedDate', 'desc')
    .limit(MAX_HISTORY_ROWS + 1)
    .get();

  // Do not calculate max/sums from a partial snapshot; that would be misleading.
  if (snapshot.docs.length > MAX_HISTORY_ROWS) {
    throw new Error('Este período tiene demasiados movimientos para una consulta completa. Elegí un mes o un rango menor.');
  }

  const all = snapshot.docs.map((row) => row.data());
  const expenseCategories = new Set(categories.filter((c) => c.isExpense).map((c) => c.name));
  const perCategory = new Map();
  const sales = [];
  const monthly = new Map();

  for (const entry of all) {
    const name = String(entry.category || '').slice(0, 90);
    const date = String(entry.selectedDate || '');
    const amount = asNumber(entry.amount);
    const isExpense = expenseCategories.has(name);
    if (isExpense && amount !== null && amount > 0) {
      perCategory.set(name, toCents((perCategory.get(name) || 0) + amount));
    }
    const key = date.slice(0, 7);
    const current = monthly.get(key) || { month: key, incomeArs: 0, expenseArs: 0, salesUsd: 0 };
    if (amount !== null && amount > 0 && !name.includes('Venta divisas') && !name.includes('Compra divisas')) {
      if (isExpense) current.expenseArs = toCents(current.expenseArs + amount);
      else if (!name.includes('Ingreso divisas')) current.incomeArs = toCents(current.incomeArs + amount);
    }

    if (name.includes('Venta divisas')) {
      const dollars = asNumber(entry.currencyQuantity);
      if (dollars !== null && dollars > 0) {
        current.salesUsd = toCents(current.salesUsd + dollars);
        sales.push({
          date,
          category: name,
          usdSold: dollars,
          arsReceived: amount,
          recordedExchangeRate: asNumber(entry.currencyExchangeRate),
        });
      }
    }
    monthly.set(key, current);
  }
  sales.sort((a, b) => b.usdSold - a.usdSold || a.date.localeCompare(b.date));
  const categoryTotals = [...perCategory.entries()].map(([category, amountArs]) => ({ category, amountArs }))
    .sort((a, b) => b.amountArs - a.amountArs);
  return {
    scope: 'historical-query',
    from, to,
    complete: true,
    recordCount: all.length,
    currencySales: {
      count: sales.length,
      totalUsd: toCents(sales.reduce((sum, sale) => sum + sale.usdSold, 0)),
      largest: sales[0] || null,
      // Top values are only supporting evidence: aggregates above are complete.
      largestFive: sales.slice(0, 5),
    },
    expenses: {
      totalArs: toCents(categoryTotals.reduce((sum, cat) => sum + cat.amountArs, 0)),
      categories: categoryTotals.slice(0, 15),
      note: 'Categorías del usuario marcadas como gasto; los resúmenes de tarjeta no son consumos desglosados.',
    },
    monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
    warnings: [
      'Venta de divisas es conversión patrimonial y NO ingreso de sueldo.',
      'No sumes transferencias y pagos de tarjeta como gastos duplicados.',
      'Montos y cotización provienen de movimientos guardados en LTC, no de precios vigentes.',
    ],
  };
}
