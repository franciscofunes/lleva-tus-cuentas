/**
 * Presentation-only interpretation of user-recorded portfolio verifications.
 *
 * Never treat capital transfers as investment earnings or losses.
 * Snapshot records are observations, NOT audited bank statements.
 * This module does not write or migrate any user data.
 */
const validNumber = (value) => value !== null && value !== undefined && value !== ''
  ? Number(value) : NaN;
const finite = (value) => Number.isFinite(value) ? value : 0;
export const snapshotDate = (row) => {
  const value = row?.capturedAt;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date(0);
};

export const sortedAccountSnapshots = (rows = []) =>
  [...rows].sort((a, b) => snapshotDate(a) - snapshotDate(b)
    || String(a?.id || '').localeCompare(String(b?.id || '')));

export const accountMovementType = (row) =>
  ['earning', 'deposit', 'withdrawal', 'adjustment', 'valuation'].includes(row?.changeType)
    ? row.changeType : 'unclassified';

export const accountMovementLabel = (type) => ({
  earning: 'Rendimiento registrado',
  deposit: 'Aporte de capital',
  withdrawal: 'Retiro de capital',
  adjustment: 'Ajuste de saldo',
  valuation: 'Valuación',
  unclassified: 'Sin clasificar',
}[type] || 'Sin clasificar');

export const summarizeAccountActivity = (position = {}, snapshots = []) => {
  const rows = sortedAccountSnapshots(snapshots);
  const summary = {
    userTaggedEarnings: 0,
    deposits: 0,
    withdrawals: 0,
    adjustments: 0,
    unclassifiedCount: 0,
    sequenceMismatchCount: 0,
    earningCount: 0,
    capitalCount: 0,
    snapshotCount: rows.length,
    balanceDifference: rows.length >= 2
      ? finite(validNumber(rows[rows.length - 1].balance)) - finite(validNumber(rows[0].balance))
      : null,
    reportedEarnings: Number.isFinite(validNumber(position.realizedEarnings))
      ? Number(position.realizedEarnings) : null,
    dailyEstimate: position.trackingMode === 'DAILY_RATE'
      ? finite(validNumber(position.balance)) * finite(validNumber(position.annualRate)) / 36500
      : null,
  };
  rows.forEach((row, index) => {
    const change = validNumber(row.observedEarning);
    if (index > 0 && snapshotDate(row).getTime() > 0 &&
      snapshotDate(rows[index - 1]).getTime() > 0) {
      const previousBalance = validNumber(rows[index - 1].balance);
      const currentBalance = validNumber(row.balance);
      if (Number.isFinite(change) && Number.isFinite(previousBalance)
        && Number.isFinite(currentBalance)
        && Math.abs((currentBalance - previousBalance) - change) > 0.02) {
        // Data may have been edited, deleted or timestamped out of sequence.
        // Warn only; never alter saved balance, type or investment return.
        summary.sequenceMismatchCount += 1;
      }
    }
    const type = accountMovementType(row);
    if (type === 'earning') {
      const amount = validNumber(row.confirmedEarning);
      const taggedAmount = Number.isFinite(amount) ? amount : change;
      if (Number.isFinite(taggedAmount)) summary.userTaggedEarnings += taggedAmount;
      summary.earningCount += 1;
    } else if (type === 'deposit' && Number.isFinite(change) && change > 0) {
      summary.deposits += change;
      summary.capitalCount += 1;
    } else if (type === 'withdrawal' && Number.isFinite(change) && change < 0) {
      summary.withdrawals += Math.abs(change);
      summary.capitalCount += 1;
    } else if (type === 'adjustment') {
      summary.adjustments += Number.isFinite(change) ? change : 0;
    } else if (type === 'unclassified'
      || (type === 'deposit' && !(change > 0))
      || (type === 'withdrawal' && !(change < 0))) {
      summary.unclassifiedCount += 1;
    }
  });
  summary.negativeLegacyEarnings = summary.reportedEarnings !== null
    && summary.reportedEarnings < 0;
  summary.earningsMismatch = summary.reportedEarnings !== null
    && summary.earningCount > 0
    && Math.abs(summary.reportedEarnings - summary.userTaggedEarnings) > 0.01;
  summary.needsReview = summary.negativeLegacyEarnings
    || summary.earningsMismatch || summary.unclassifiedCount > 0
    || summary.sequenceMismatchCount > 0;
  return summary;
};

const startOfPeriod = (date, mode) => {
  const result = new Date(date);
  if (mode === 'day') result.setHours(0, 0, 0, 0);
  if (mode === 'week') {
    result.setDate(result.getDate() - (result.getDay() + 6) % 7);
    result.setHours(0, 0, 0, 0);
  }
  if (mode === 'month') {
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
  }
  return result;
};

/**
 * Earnings: sum only snapshots tagged 'earning'.
 * Expected: pick the latest verification per local calendar day; a second
 * verification on the same day is not a second day of expected interest.
 */
export const groupAccountEarnings = (snapshots = [], mode = 'day') => {
  const periods = new Map();
  const daily = new Map();
  sortedAccountSnapshots(snapshots).forEach((row) => {
    const capturedAt = snapshotDate(row);
    if (!Number.isFinite(capturedAt.getTime()) || capturedAt.getTime() === 0) return;
    const period = startOfPeriod(capturedAt, mode);
    const key = period.getTime();
    if (!periods.has(key)) periods.set(key, { date: period, earning: 0, expected: 0, checks: 0 });
    const aggregate = periods.get(key);
    aggregate.checks += 1;
    if (accountMovementType(row) === 'earning') {
      const confirmed = validNumber(row.confirmedEarning);
      const observed = validNumber(row.observedEarning);
      aggregate.earning += finite(Number.isFinite(confirmed) ? confirmed : observed);
    }
    const expected = validNumber(row.expectedEarning);
    if (Number.isFinite(expected)) {
      const dayKey = startOfPeriod(capturedAt, 'day').getTime();
      daily.set(dayKey, { key, value: expected });
    }
  });
  daily.forEach(({ key, value }) => { periods.get(key).expected += value; });
  return [...periods.values()].sort((a, b) => a.date - b.date);
};
