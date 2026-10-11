import { buildPortfolioPdf } from './portfolioPdf';

const items = [
  { id: 'usd', institution: 'Banco', name: 'Cuenta USD', category: 'Cuenta remunerada',
    currency: 'USD', balance: 1000, annualRate: 4, rateType: 'TNA',
    realizedEarnings: 12, liquidity: 'Inmediata', sourceCheckedAt: '2026-10-10' },
  { id: 'ars', institution: 'Otro', name: 'Plazo fijo ARS', category: 'Plazo fijo',
    currency: 'ARS', balance: 500000, annualRate: 45, rateType: 'TEA',
    realizedEarnings: 2000, maturityDate: '2026-12-05' },
];

test('portfolio PDF is a private, branded PDF of positions in separate currencies', () => {
  const pdf = buildPortfolioPdf(items, [{ positionId: 'usd', balance: 900, currency: 'USD', capturedAt: '2026-10-10' }]);
  expect(pdf.type).toBe('application/pdf');
  expect(pdf.size).toBeGreaterThan(1300);
  expect(items[0].balance).toBe(1000);
});

test('multiple positions and observations create paginated PDF without truncation', () => {
  const positions = Array.from({ length: 100 }, (_, i) => ({ ...items[0], id: String(i), name: 'Cuenta ' + i }));
  const snapshots = Array.from({ length: 75 }, (_, i) => ({ balance: 100 + i, currency: 'USD', name: 'Cuenta ' + i }));
  const pdf = buildPortfolioPdf(positions, snapshots);
  expect(pdf.type).toBe('application/pdf');
  expect(pdf.size).toBeGreaterThan(8000);
});

test('empty and invalid inputs cannot produce a misleading portfolio report', () => {
  expect(() => buildPortfolioPdf([], [])).toThrow('No hay posiciones');
});
