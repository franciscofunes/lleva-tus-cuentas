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

describe('Spanish LITA-ready portfolio copy', () => {
  const p = (id) => ({
    id, institution: 'Banco Ejemplo', name: 'Cuenta remunerada',
    category: 'Cuenta remunerada', currency: 'USD', balance: 1000,
    annualRate: 0, rateType: 'TNA',
  });

  it('keeps the recognized LTC financial report sections for the backend scope guard', () => {
    const prompt = buildPortfolioLlmMarkdown(Array.from({ length: 8 }, (_, index) => p(String(index))), []);
    expect(prompt.startsWith('# Portfolio LTC — contexto para análisis LLM')).toBe(true);
    expect(prompt).toContain('## Totales por moneda');
    expect(prompt).toContain('## Posiciones');
    expect(prompt).toContain('## Pedido de investigación y análisis');
    expect(prompt).toContain('Idioma solicitado: ESPAÑOL (Argentina)');
    expect(prompt).toContain('Analizá exclusivamente los datos adjuntos');
    expect(prompt).toContain('Tasa cargada: 0% TNA');
    expect(prompt.length).toBeLessThan(32000);
    expect(prompt).not.toContain('si tenés acceso a Internet, investigá CADA activo');
    expect(prompt).not.toContain('Citá URL y fecha de consulta para cada dato investigado');
  });

  it('does not promise verified current rates or automatic investment updates', () => {
    const prompt = buildPortfolioLlmMarkdown([p('1')], []);
    expect(prompt).toContain('no puede navegar por Internet ni verificar tasas bancarias vigentes');
    expect(prompt).toContain('No generes bloques LTC Asset Update si no hay valores nuevos comprobados');
    expect(prompt).toContain('Nunca apliques cambios de forma automática');
  });
});
