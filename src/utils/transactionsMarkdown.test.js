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
