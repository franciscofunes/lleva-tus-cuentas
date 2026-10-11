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

describe('portfolio export adapters for the shared LTC$ file modal', () => {
  const { buildPortfolioExportSheets, buildPortfolioCsv, preparePortfolioExport } = require('./portfolioExport');
  const positions = [
    { id: 'usd', institution: 'Banco A', name: 'Cuenta USD', category: 'Cuenta remunerada',
      currency: 'USD', balance: 300, annualRate: 4, rateType: 'TNA', realizedEarnings: 8 },
    { id: 'ars', institution: 'Banco B', name: '=IMPORTDATA("evil")', category: 'FCI', ticker: 'ABC',
      currency: 'ARS', balance: 120000, annualRate: 25, rateType: 'TEA',
      monthlyReturns: { jan: 0.5, feb: 0.3 }, publishedYtdReturn: 0.8 },
  ];
  const snapshots = [
    { institution: 'Banco A', name: 'Cuenta USD', currency: 'USD',
      balance: 285, annualRate: 3.5, capturedAt: '2026-09-30', source: 'Manual' },
  ];

  test('preserves positions, FCI and full verification history in the workbook', () => {
    const sheets = buildPortfolioExportSheets(positions, snapshots);
    expect(sheets.Posiciones).toHaveLength(3);
    expect(sheets['FCI mensual']).toHaveLength(2);
    expect(sheets['FCI mensual'][1][3]).toBe(0.5);
    expect(sheets.Historial).toHaveLength(2);
    expect(sheets['Información LTC$']).toContainEqual(['LTC$ — Lleva tus cuentas', 'Portfolio de usuario']);
    expect(sheets['Información LTC$']).toContainEqual(['ARS', 120000]);
    expect(sheets['Información LTC$']).toContainEqual(['USD', 300]);
    expect(sheets['Información LTC$'].some(row => String(row[1]).includes('no verificadas en tiempo real'))).toBe(true);
  });

  test('exports branded formula-safe CSV without joining different currencies or omitting positions', () => {
    const csv = buildPortfolioCsv(positions, snapshots);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Moneda";"Saldo"');
    expect(csv).toContain('"Origen"');
    expect(csv).toContain('"LTC$"');
    expect(csv).toContain("'=IMPORTDATA");
    expect(csv).toContain('300');
    expect(csv).toContain('120000');
    expect(csv.trim().split(/\\r\\n/)).toHaveLength(3);
  });

  test('prepares private XLSX/CSV Blobs plus PDF inputs without auto downloading', () => {
    const prepared = preparePortfolioExport(positions, snapshots, new Date('2026-10-11T13:20:01.222Z'));
    expect(prepared.count).toBe(2);
    expect(prepared.filename).toBe('portfolio-ltc-2026-10-11-132001222-2-posiciones.xlsx');
    expect(prepared.csvFilename).toBe('portfolio-ltc-2026-10-11-132001222-2-posiciones.csv');
    expect(prepared.xlsxBlob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(prepared.xlsxBlob.size).toBeGreaterThan(1200);
    expect(prepared.csvBlob.type).toBe('text/csv;charset=utf-8');
    expect(prepared.pdfSource).toEqual({ positions, snapshots });
    expect(positions).toHaveLength(2);
    expect(snapshots).toHaveLength(1);
  });

  test('prevents exporting an empty portfolio as a fake success', () => {
    expect(() => preparePortfolioExport([], [])).toThrow(/No hay posiciones/);
  });
});
