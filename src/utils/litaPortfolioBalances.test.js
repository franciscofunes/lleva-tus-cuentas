import { summarizeLitaPortfolioBalances } from './litaPortfolioBalances';

test('Portfolio totals are stock per currency, never monthly income or converted totals', () => {
  const result = summarizeLitaPortfolioBalances([
    { currency: 'USD', balance: 5000, category: 'Cuenta remunerada' },
    { currency: 'USD', balance: '25000.50', category: 'FCI' },
    { currency: 'ARS', balance: 200000, category: 'Cuenta remunerada' },
  ], new Date('2026-11-21T15:00:00.000Z'));
  expect(result).toMatchObject({
    status: 'ok', source: 'portfolioPositions',
    positionCount: 3, excludedPositions: 0,
    retrievedAt: '2026-11-21T15:00:00.000Z',
    byCurrency: {
      ARS: { balance: 200000, positionCount: 1 },
      USD: { balance: 30000.5, positionCount: 2 },
    },
  });
  expect(result).not.toHaveProperty('income');
  expect(result).not.toHaveProperty('possibleMonthlySavings');
});

test('invalid amounts and currencies cannot inflate Portfolio savings', () => {
  const result = summarizeLitaPortfolioBalances([
    { currency: 'USD', balance: NaN },
    { currency: 'USD', balance: '' },
    { currency: 'USD', balance: -50 },
    { currency: 'USD', balance: 'foo' },
    { currency: 'EUR', balance: 500 },
    { currency: 'USD', balance: 100 },
  ]);
  expect(result.byCurrency.USD).toEqual({ balance: 100, positionCount: 1 });
  expect(result.excludedPositions).toBe(5);
  expect(summarizeLitaPortfolioBalances([]).status).toBe('empty');
  expect(summarizeLitaPortfolioBalances([{ currency: 'USD', balance: 'x' }]).status).toBe('unavailable');
  expect(summarizeLitaPortfolioBalances(null).status).toBe('unavailable');
});
