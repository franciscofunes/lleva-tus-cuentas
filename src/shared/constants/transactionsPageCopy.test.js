import { TRANSACTIONS_PAGE_COPY as copy } from './transactionsPageCopy';

test('the transactions hero focuses on day-to-day spending and income, not portfolio summaries', () => {
  expect(copy.hero).toEqual({
    eyebrow: 'Tus movimientos, bajo control',
    title: 'Gastos e ingresos',
    description: expect.stringContaining('en qué gastás'),
  });
  expect(copy.overview.title).toBe('Tus movimientos en números');
  expect(copy.overview.eyebrow).toBe('Herramientas y estadísticas');
  expect(copy.summary.title).toBe('Ingresos y gastos en ARS y USD');
  expect(copy.summary.description).toMatch(/conversiones por moneda/);
  expect(copy.summary.description).toMatch(/inversiones se muestran aparte/);
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
