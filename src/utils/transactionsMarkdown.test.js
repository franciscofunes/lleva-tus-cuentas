import { parseTransactionsMarkdown } from './transactionsMarkdown';

describe('Markdown import for foreign currency sales', () => {
  const sale = [
    '- name: Venta de dólares - Segunda tanda',
    '  category: Venta divisas',
    '  date: 2026-10-09',
    '  currencyQuantity: 145.51',
    '  currencyExchangeRate: 1580.64',
    '  amount: 229999.98',
    '  comment: Dos operaciones agrupadas',
    '  source: captura-cambio-moneda-2',
    '  period: 2026-10',
  ].join('\n');

  it('keeps the exact ARS proceeds and exchange rate when parsing a sale', () => {
    const [item] = parseTransactionsMarkdown(sale);
    expect(item.errors).toEqual([]);
    expect(item.category).toBe('Venta divisas');
    expect(item.currencyQuantity).toBe(145.51);
    expect(item.currencyExchangeRate).toBe(1580.64);
    expect(item.amount).toBe(229999.98);
    expect(item.selectedDate).toBe('2026-10-09');
    expect(item.source).toBe('captura-cambio-moneda-2');
  });

  it('accepts a Spanish exchange-rate field alias', () => {
    const [item] = parseTransactionsMarkdown(sale.replace('currencyExchangeRate:', 'cotizacion:'));
    expect(item.currencyExchangeRate).toBe(1580.64);
    expect(item.errors).toEqual([]);
  });

  it('rejects an invalid supplied exchange rate', () => {
    const [item] = parseTransactionsMarkdown(sale.replace('1580.64', 'not-a-number'));
    expect(item.errors).toContain('Cotización inválida');
  });

  it('keeps existing USD income Markdown without a rate compatible', () => {
    const [item] = parseTransactionsMarkdown('- name: Rendimiento\n  category: Ingreso divisas\n  date: 2026-10-09\n  currencyQuantity: 18.42');
    expect(item.errors).toEqual([]);
    expect(item.currencyExchangeRate).toBe('');
  });
});


describe('Guided LITA Markdown works for every transaction class', () => {
  const parse = (items) => parseTransactionsMarkdown(items)[0];

  it('accepts a regular expense and income without inventing USD quantities', () => {
    const expense = parse('- name: Farmacity\n  category: Salud 🏥\n  date: 2026-10-10\n  amount: 35079\n  source: lita-guided');
    expect(expense.errors).toEqual([]);
    expect(expense.currencyQuantity).toBe('');
    expect(expense.amount).toBe(35079);
    const income = parse('- name: Honorarios\n  category: Sueldo\n  date: 2026-10-10\n  amount: 250000');
    expect(income.errors).toEqual([]);
    expect(income.importKey).not.toBe(expense.importKey);
  });

  it('keeps card statement due date, closing date and amount', () => {
    const item = parse('- name: Santander Visa\n  category: Resumen tarjeta 💳\n  date: 2026-10-13\n  amount: 1590805.54\n  selectedExpirationDate: 2026-10-13\n  selectedCloseDate: 2026-09-30');
    expect(item.errors).toEqual([]);
    expect(item.selectedCloseDate).toBe('2026-09-30');
    expect(item.selectedExpirationDate).toBe('2026-10-13');
  });

  it('rejects a missing regular amount, invalid calendar date and missing statement dates', () => {
    const item = parse('- name: Compra\n  category: Alimentación\n  date: 2026-02-30');
    expect(item.errors).toContain('Monto inválido');
    expect(item.errors).toContain('Fecha inválida');
    const statement = parse('- name: Visa\n  category: Resumen tarjeta\n  date: 2026-10-10\n  amount: 1000');
    expect(statement.errors).toContain('Cierre inválido');
    expect(statement.errors).toContain('Vencimiento inválido');
  });

  it('parses two ordinary purchases separately and makes different deduplication IDs', () => {
    const rows = parseTransactionsMarkdown('- name: Farmacia\n  category: Salud\n  amount: 400\n  date: 2026-10-10\n- name: Supermercado\n  category: Alimentación\n  amount: 400\n  date: 2026-10-10');
    expect(rows).toHaveLength(2);
    expect(rows.every(({ errors }) => errors.length === 0)).toBe(true);
    expect(rows[0].importKey).not.toBe(rows[1].importKey);
  });
});
