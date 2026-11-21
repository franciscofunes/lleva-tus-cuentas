/**
 * A read-only snapshot of Portfolio balances. This is STOCK, not a monthly
 * income or confirmed savings-flow estimate. It must never be summed with
 * balances from Banks (which might represent the same financial accounts).
 */
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const emptyTotals = () => ({
  ARS: { balance: 0, positionCount: 0 },
  USD: { balance: 0, positionCount: 0 },
});

export function summarizeLitaPortfolioBalances(positions = [], asOf = new Date()) {
  if (!Array.isArray(positions)) {
    return { source: 'portfolioPositions', status: 'unavailable' };
  }
  if (positions.length === 0) {
    return { source: 'portfolioPositions', status: 'empty', positionCount: 0 };
  }

  const totals = emptyTotals();
  let excludedPositions = 0;
  let totalPositionCount = 0;
  for (const position of positions) {
    const currency = position?.currency;
    const raw = position?.balance;
    if (!['ARS', 'USD'].includes(currency) ||
      raw === null || raw === undefined || raw === '' ||
      (typeof raw !== 'number' && typeof raw !== 'string')) {
      excludedPositions++;
      continue;
    }
    const balance = Number(raw);
    if (!Number.isFinite(balance) || balance < 0 || balance > 1e14) {
      excludedPositions++;
      continue;
    }
    totals[currency].balance = round(totals[currency].balance + balance);
    totals[currency].positionCount++;
    totalPositionCount++;
  }

  if (!totalPositionCount) {
    return { source: 'portfolioPositions', status: 'unavailable', excludedPositions };
  }

  return {
    source: 'portfolioPositions',
    status: 'ok',
    // Date of the read, NOT of a financial institution verification.
    retrievedAt: Number.isNaN(asOf.getTime()) ? null : asOf.toISOString(),
    positionCount: totalPositionCount,
    excludedPositions,
    byCurrency: totals,
    note: 'Saldos cargados manualmente por el usuario. Pueden estar desactualizados, incluir inversiones y fondos no líquidos. No son ingresos mensuales ni ahorros generados este mes. No sumar a Bancos sin conciliación.',
  };
}
