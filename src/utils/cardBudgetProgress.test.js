import { cardBudgetProgress } from './cardBudgetProgress';

describe('card budget progress', () => {
  test('displays correct amount still available in the screen example', () => {
    expect(cardBudgetProgress(1292728.06, 1367794.13)).toMatchObject({
      remaining: 75066.07,
      overage: 0,
      percent: 95,
      level: 'critical',
    });
  });
  test('works independently per currency, including cents and tiny values', () => {
    expect(cardBudgetProgress(20, 33.08)).toMatchObject({
      remaining: 13.08, level: 'warning',
    });
    expect(cardBudgetProgress(0.1, 0.3)).toMatchObject({
      remaining: 0.2, level: 'ok',
    });
  });
  test('70/90/100% are visual levels, configurable alert level remains separate', () => {
    expect(cardBudgetProgress(699, 1000).level).toBe('ok');
    expect(cardBudgetProgress(700, 1000).level).toBe('warning');
    expect(cardBudgetProgress(899.99, 1000).level).toBe('warning');
    expect(cardBudgetProgress(900, 1000).level).toBe('critical');
    expect(cardBudgetProgress(999.99, 1000).level).toBe('critical');
    expect(cardBudgetProgress(1000, 1000).level).toBe('exceeded');
  });
  test('avoids negative remaining when exceeded', () => {
    expect(cardBudgetProgress(112430.5, 100000)).toMatchObject({
      remaining: 0, overage: 12430.5, level: 'exceeded',
    });
  });
  test('never shows misleading remaining for absent or invalid limits', () => {
    [null, undefined, '', 0, -100, 'foobar', NaN, Infinity].forEach(limit => {
      expect(cardBudgetProgress(50, limit)).toBeNull();
    });
  });
  test('does not round 89.99% into orange critical', () => {
    expect(cardBudgetProgress(899.9, 1000).level).toBe('warning');
  });
});
