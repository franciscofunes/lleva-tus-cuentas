// CRA's Jest/jsdom environment lacks TextEncoder, which the existing XLSX module initializes on import.
// The browser provides it natively; this polyfill is limited to tests.
const { TextEncoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
const { buildPortfolioLlmMarkdown } = require('./portfolioExport');

describe('portfolio LLM prompt accounting semantics', () => {
  const p = (overrides = {}) => ({
    id: 'astro', institution: 'AstroPay', name: 'Saldo USD con rendimiento',
    category: 'Cuenta remunerada', currency: 'USD', balance: 10000,
    realizedEarnings: 5.17, annualRate: 3.1, rateType: 'CASHBACK ANUAL',
    ...overrides,
  });

  it('describes an 800 USD withdrawal as a classified movement, not a loss or rate change', () => {
    const prompt = buildPortfolioLlmMarkdown(
      [p()], [{ positionId: 'astro', changeType: 'withdrawal', observedEarning: -800 }],
    );
    expect(prompt).toContain('Saldo: 10000');
    expect(prompt).toContain('Tasa cargada: 3.1% CASHBACK ANUAL');
    expect(prompt).toContain('Retiros clasificados (variación de saldo, no ganancia): -800');
    expect(prompt).toContain('Ganancias acumuladas cargadas (no auditadas): 5.17');
    expect(prompt).toContain('Un retiro baja el saldo invertido pero NO la tasa');
    expect(prompt).toContain('NO la vuelvas a contar como gasto de tarjeta');
  });

  it('flags negative balances previously labeled as earnings for review, without rewriting them', () => {
    const prompt = buildPortfolioLlmMarkdown(
      [p({ id: 'mp', institution: 'Mercado Pago', realizedEarnings: -499.46 })],
      [{ positionId: 'mp', changeType: 'withdrawal', observedEarning: -500 }],
    );
    expect(prompt).toContain('Ganancias acumuladas cargadas (no auditadas): -499.46');
    expect(prompt).toContain('Estado de revisión: Revisar registros');
    expect(prompt).toContain('NO representa una pérdida comprobada');
  });
});
