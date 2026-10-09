import { auditPortfolioEarnings } from './portfolioEarningsAudit';

const position = { id: 'astropay', category: 'Cuenta remunerada', currency: 'USD', realizedEarnings: 5.17 };

describe('portfolio earnings provenance audit', () => {
  it('counts a withdrawal as capital flow and never as earnings', () => {
    const result = auditPortfolioEarnings(position, [
      { positionId: 'astropay', changeType: 'withdrawal', observedEarning: -800, confirmedEarning: 0 },
      { positionId: 'astropay', changeType: 'earning', observedEarning: 0.37, confirmedEarning: 0.37 },
      { positionId: 'different', changeType: 'earning', observedEarning: 100 },
    ]);
    expect(result.recordedWithdrawals).toBe(-800);
    expect(result.userTaggedEarnings).toBeCloseTo(0.37);
    expect(result.classifications.withdrawal).toBe(1);
    expect(result.snapshotCount).toBe(2);
    expect(result.reportedEarnings).toBe(5.17);
    expect(result.reportedEarningsStatus).toBe('user_entered_not_independently_reconciled');
  });

  it('flags suspicious negative legacy earnings without mutating the amount', () => {
    const result = auditPortfolioEarnings(
      { id: 'mp', realizedEarnings: -499.46, category: 'Cuenta remunerada' },
      [{ positionId: 'mp', changeType: 'withdrawal', observedEarning: -500, confirmedEarning: 0 }],
    );
    expect(result.reportedEarnings).toBe(-499.46);
    expect(result.negativeReported).toBe(true);
    expect(result.needsReview).toBe(true);
    expect(result.note).toMatch(/NO representa una pérdida comprobada/);
  });

  it('does not infer gain from an unclassified balance decrease', () => {
    const result = auditPortfolioEarnings(
      { id: 'a', realizedEarnings: 0 },
      [{ positionId: 'a', observedEarning: -300, changeType: 'unclassified' }],
    );
    expect(result.userTaggedEarnings).toBe(0);
    expect(result.recordedWithdrawals).toBe(0);
    expect(result.classifications.unclassified).toBe(1);
    expect(result.needsReview).toBe(true);
  });

  it('does not infer rate changes or classify FCI NAV as interest', () => {
    const fund = { id: 'fci', category: 'FCI', realizedEarnings: 71, annualRate: 5.19 };
    const result = auditPortfolioEarnings(fund, [
      { positionId: 'fci', changeType: 'valuation', observedEarning: -200 },
    ]);
    expect(result.classifications.valuation).toBe(1);
    expect(result.userTaggedEarnings).toBe(0);
    expect(fund.annualRate).toBe(5.19);
  });
});
