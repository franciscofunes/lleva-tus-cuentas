import { getTransactionCurrency } from './customCategories';

/**
 * Category totals use the SAME filtered transaction rows as the Dashboard.
 * Each expense has an explicit currency. Never mix ARS and USD.
 * This is aggregate reference data, never an exchange-rate conversion.
 */
export const summarizeSpendingByCategory = (docs = [], categories = []) => {
  const expenses = new Set(
    categories.filter((item) => item?.isExpense === true)
      .map((item) => String(item.name || '').trim())
      .filter(Boolean)
  );
  const totals = new Map();
  let expenseCount = 0;
  let invalidAmountCount = 0;
  const usdTotals = new Map();

  for (const transaction of docs) {
    const category = String(transaction?.category || '').trim();
    if (!expenses.has(category)) continue;

    const raw = transaction?.amount;
    if (raw === '' || raw === null || raw === undefined) {
      invalidAmountCount += 1;
      continue;
    }
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      invalidAmountCount += 1;
      continue;
    }

    expenseCount += 1;
    if (getTransactionCurrency(transaction) === 'USD') {
      const currentUsd = usdTotals.get(category) || { category, totalUsd: 0, transactionCount: 0 };
      currentUsd.totalUsd += amount;
      currentUsd.transactionCount += 1;
      usdTotals.set(category, currentUsd);
      continue;
    }
    const current = totals.get(category) || { category, totalArs: 0, transactionCount: 0 };
    current.totalArs += amount;
    current.transactionCount += 1;
    totals.set(category, current);
  }

  const sorted = [...totals.values()].sort((a, b) => b.totalArs - a.totalArs);
  const totalArs = sorted.reduce((sum, item) => sum + item.totalArs, 0);
  return {
    currency: 'ARS',
    scope: 'current-view',
    totalArs: Math.round(totalArs * 100) / 100,
    totalUsd: Math.round([...usdTotals.values()].reduce((sum, row) => sum + row.totalUsd, 0) * 100) / 100,
    categoriesUsd: [...usdTotals.values()].map((item) => ({
      ...item, totalUsd: Math.round(item.totalUsd * 100) / 100,
    })),
    transactionCount: expenseCount,
    invalidAmountCount,
    categories: sorted.map((item) => ({
      ...item,
      totalArs: Math.round(item.totalArs * 100) / 100,
      percentOfSpending: totalArs > 0 ? Math.round((item.totalArs / totalArs) * 10000) / 100 : 0,
    })),
  };
};
