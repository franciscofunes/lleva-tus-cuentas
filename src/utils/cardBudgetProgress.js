// Presentation-only budget progress. Keep the configurable notification threshold
// separate: the visual 70/90/100% steps must NOT silently change saved alert rules.
const cents = value => {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n < 1e12
    ? Math.round(n * 100) : null;
};

export function cardBudgetProgress(currentAmount, limitAmount) {
  const limitCents = cents(limitAmount);
  if (!limitCents || limitCents <= 0) return null;
  const spentCents = cents(currentAmount) ?? 0;
  const ratio = spentCents / limitCents;
  const remainingCents = Math.max(limitCents - spentCents, 0);
  const overageCents = Math.max(spentCents - limitCents, 0);
  const level = ratio >= 1 ? 'exceeded'
    : ratio >= 0.9 ? 'critical'
    : ratio >= 0.7 ? 'warning' : 'ok';
  return {
    spent: spentCents / 100,
    limit: limitCents / 100,
    remaining: remainingCents / 100,
    overage: overageCents / 100,
    percent: Math.round(ratio * 100),
    ratio,
    level,
    barPercent: Math.min(100, ratio * 100),
  };
}
