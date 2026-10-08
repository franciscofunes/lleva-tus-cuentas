import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

// Transactions are persisted in two different units:
// - amount: pesos (ARS) for regular ARS cash movements and conversions
// - currencyQuantity: dollars (USD) for Ingreso/Compra/Venta divisas
// These flows are NOT portfolio balances or financial profit.
const safeAmount = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const hasCategory = (category, needle) =>
  String(category || '').toLocaleLowerCase('es-AR').includes(needle.toLocaleLowerCase('es-AR'));

export const summarizeBimonetaryFlows = (docs = [], categories = []) => {
  const expenses = new Set(
    categories.filter((c) => c?.isExpense === true).map((c) => c.name)
  );
  const incomes = new Set(
    categories.filter((c) => c?.isExpense === false).map((c) => c.name)
  );
  const result = {
    earnedArs: 0,
    spentArs: 0,
    fromUsdSalesArs: 0,
    spentOnUsdPurchasesArs: 0,
    earnedUsd: 0,
    purchasedUsd: 0,
    soldUsd: 0,
    unexplainedArsCount: 0,
    missingUsdCount: 0,
    // Cash flows only: not wealth, not an FX-adjusted economic result.
    knownArsNet: 0,
    knownUsdMovement: 0,
  };

  (docs || []).forEach((doc) => {
    const cat = String(doc?.category || '');
    const isIngresoUsd = hasCategory(cat, INGRESO_DIVISAS_CATEGORY);
    const isCompraUsd = hasCategory(cat, 'Compra divisas');
    const isVentaUsd = hasCategory(cat, 'Venta divisas');
    const ars = safeAmount(doc?.amount);
    const usd = safeAmount(doc?.currencyQuantity);

    if (isIngresoUsd || isCompraUsd || isVentaUsd) {
      if (usd === null) result.missingUsdCount += 1;
      else if (isIngresoUsd) result.earnedUsd += usd;
      else if (isCompraUsd) result.purchasedUsd += usd;
      else result.soldUsd += usd;
    }

    if (ars === null) {
      if (!isIngresoUsd && (expenses.has(cat) || incomes.has(cat) || isCompraUsd || isVentaUsd)) {
        result.unexplainedArsCount += 1;
      }
      return;
    }

    if (isVentaUsd) {
      result.fromUsdSalesArs += ars;
      result.knownArsNet += ars;
    } else if (isCompraUsd) {
      result.spentOnUsdPurchasesArs += ars;
      result.knownArsNet -= ars;
    } else if (isIngresoUsd) {
      // USD income has no ARS equivalent until it is converted.
    } else if (expenses.has(cat)) {
      result.spentArs += ars;
      result.knownArsNet -= ars;
    } else if (incomes.has(cat)) {
      result.earnedArs += ars;
      result.knownArsNet += ars;
    }
  });

  result.knownUsdMovement = result.earnedUsd + result.purchasedUsd - result.soldUsd;
  return result;
};

// Portfolio is a current-position snapshot, never the sum of historical flows.
// Reject invalid balances rather than silently introducing NaN/negative totals.
export const sumPortfolioCurrencies = (positions = []) =>
  (positions || []).reduce((totals, position) => {
    const currency = String(position?.currency || '').toUpperCase();
    if (currency !== 'USD' && currency !== 'ARS') return totals;
    const balance = safeAmount(position?.balance);
    if (balance === null) return totals;
    totals[currency] += balance;
    totals.positions += 1;
    return totals;
  }, { USD: 0, ARS: 0, positions: 0 });
