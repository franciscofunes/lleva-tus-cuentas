import { TRANSACTIONS_PAGE_COPY as copy } from './transactionsPageCopy';

test('the transactions hero focuses on day-to-day spending and income, not portfolio summaries', () => {
  expect(copy.hero).toEqual({
    eyebrow: 'Control diario',
    title: 'Gastos e ingresos',
    description: expect.stringContaining('movimientos en pesos y dólares'),
  });
  expect(copy.overview.title).toBe('Métricas y exportaciones');
  expect(copy.overview.eyebrow).toBe('Herramientas');
  expect(copy.summary.title).toBe('Resumen ARS y USD');
  expect(copy.summary.description).toMatch(/conversiones del período/);
  expect(copy.summary.description).toMatch(/inversiones aparte/);
});

test('the overview labels accurately describe registered data, rather than claiming upcoming due dates', () => {
  expect(copy.metrics).toEqual({
    count: 'Transacciones',
    categories: 'Categorías utilizadas',
    due: 'Vencimientos registrados',
  });
  expect(copy.metrics.due).not.toMatch(/próximos|pendientes/i);
});

test('copy does not misidentify the transaction page as a portfolio or balance report', () => {
  for (const text of [copy.hero.title, copy.overview.title, copy.summary.title]) {
    expect(text).not.toMatch(/resumen financiero|patrimonio|inversiones|saldo bancario/i);
  }
});
