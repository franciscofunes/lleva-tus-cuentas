/**
 * Separates what the user recorded about earnings from balance movements.
 * Snapshot labels are user-supplied, not independent proof of bank interest.
 * Legacy positions may contain earnings wrongly added by older verification flows;
 * never silently rewrite them without a transaction-by-transaction review.
 */
export const auditPortfolioEarnings = (position = {}, snapshots = []) => {
  const rows = (snapshots || []).filter((row) => row.positionId === position.id);
  const values = { earning: 0, deposit: 0, withdrawal: 0, valuation: 0, adjustment: 0, unclassified: 0 };
  const amounts = { userTaggedEarnings: 0, deposits: 0, withdrawals: 0 };

  rows.forEach((row) => {
    const type = Object.prototype.hasOwnProperty.call(values, row.changeType)
      ? row.changeType : 'unclassified';
    values[type] += 1;
    // For historic rows with a type, confirmedEarning may not have been recorded.
    // This is explicitly USER-TAGGED, never independently reconciled.
    const difference = Number(row.observedEarning);
    if (type === 'earning') {
      const reported = row.confirmedEarning == null ? difference : Number(row.confirmedEarning);
      if (Number.isFinite(reported)) amounts.userTaggedEarnings += reported;
    }
    if (type === 'deposit' && Number.isFinite(difference) && difference > 0) amounts.deposits += difference;
    if (type === 'withdrawal' && Number.isFinite(difference) && difference < 0) amounts.withdrawals += difference;
  });

  const reportedValue = position.realizedEarnings;
  const hasReportedEarnings = reportedValue !== null && reportedValue !== undefined && reportedValue !== '';
  const reportedEarnings = hasReportedEarnings && Number.isFinite(Number(reportedValue))
    ? Number(reportedValue) : null;
  const isFund = position.trackingMode === 'NAV' || position.category === 'FCI';
  const negativeReported = reportedEarnings != null && reportedEarnings < 0;
  // Difference doesn't prove an error: snapshots may not cover lifetime earnings.
  const differsFromTagged = !isFund && reportedEarnings != null && values.earning > 0
    && Math.abs(reportedEarnings - amounts.userTaggedEarnings) > 0.01;

  return {
    reportedEarnings,
    reportedEarningsStatus: 'user_entered_not_independently_reconciled',
    snapshotCount: rows.length,
    classifications: values,
    userTaggedEarnings: amounts.userTaggedEarnings,
    recordedDeposits: amounts.deposits,
    recordedWithdrawals: amounts.withdrawals,
    negativeReported,
    differsFromTagged,
    needsReview: negativeReported || differsFromTagged || values.unclassified > 0,
    note: negativeReported
      ? 'La cifra negativa podría contener retiros clasificados como rendimiento: NO representa una pérdida comprobada.'
      : differsFromTagged
        ? 'El acumulado almacenado difiere de las verificaciones etiquetadas; revisar antes de interpretarlo como ganancia.'
        : values.unclassified
          ? 'Hay movimientos sin clasificar; su variación de saldo NO se considera rendimiento.'
          : 'Las verificaciones son registros del usuario, no rendimientos auditados por la entidad.',
  };
};
