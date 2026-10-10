import { exportWorkbookXlsx } from './portfolioExport';

const safeText = (value) => String(value ?? '').replace(/[\r\n|]+/g, ' ').trim();
const validMoney = (value) => value !== null && value !== undefined && value !== '' &&
  Number.isFinite(Number(value)) && Number(value) > 0;
const currencyOperation = (category) => /(?:Compra|Venta|Ingreso) divisas/i.test(category || '');
const conversion = (category) => /(?:Compra|Venta) divisas/i.test(category || '');
const getName = (row) => safeText(row.expenseName || row.name);
const getAmount = (row) => row.amount !== '' && row.amount !== null && row.amount !== undefined && Number.isFinite(Number(row.amount)) ? Number(row.amount) : null;
const getQuantity = (row) => currencyOperation(row.category) && validMoney(row.currencyQuantity)
  ? Number(row.currencyQuantity) : null;
const classification = (row, expenses) => {
  if (conversion(row.category)) return 'Conversión ARS/USD';
  if (/Resumen tarjeta/i.test(row.category || '')) return 'Pago de resumen (no duplicar consumos)';
  if (expenses.has(row.category)) return 'Gasto ARS';
  if (/Ingreso divisas/i.test(row.category || '')) return 'Ingreso USD';
  return 'Ingreso / movimiento ARS (verificar)';
};

export const buildTransactionOverview = (docs = [], categories = []) => {
  const transactions = Array.isArray(docs) ? docs : [];
  return {
    count: transactions.length,
    categoryCount: new Set(transactions.map((row) => safeText(row.category)).filter(Boolean)).size,
    dueCount: transactions.filter((row) => Boolean(row.selectedExpirationDate || row.dueDate)).length,
  };
};

export const buildTransactionsExportSheets = (docs = [], categories = [], filters = {}) => {
  const expenses = new Set(categories.filter((entry) => entry?.isExpense).map((entry) => entry.name));
  const headers = ['Fecha','Nombre','Categoría','Clasificación','ARS (registrados)','USD (cantidad)','Cotización ARS/USD','Fecha cierre','Vencimiento','Estado','Comentario'];
  const records = (Array.isArray(docs) ? docs : []).map((row) => [
    safeText(row.selectedDate), getName(row), safeText(row.category),
    classification(row, expenses),
    getAmount(row) ?? '', getQuantity(row) ?? '',
    conversion(row.category) && validMoney(row.currencyExchangeRate) ? Number(row.currencyExchangeRate) : '',
    safeText(row.selectedCloseDate), safeText(row.selectedExpirationDate || row.dueDate),
    safeText(row.paymentStatus), safeText(row.comment),
  ]);
  const expenseTotals = new Map();
  (Array.isArray(docs) ? docs : []).forEach((row) => {
    if (!expenses.has(row.category) || conversion(row.category) || !validMoney(row.amount)) return;
    const value = expenseTotals.get(row.category) || { count: 0, ars: 0 };
    value.count += 1;
    value.ars += Number(row.amount);
    expenseTotals.set(row.category, value);
  });
  const groups = [...expenseTotals].sort((a,b) => b[1].ars - a[1].ars);
  return {
    Movimientos: [headers, ...records],
    'Gastos por categoría': [
      ['Categoría','Operaciones','ARS registrados'],
      ...groups.map(([category, value]) => [category, value.count, Math.round(value.ars * 100) / 100]),
    ],
    'Filtros aplicados': [
      ['Criterio', 'Valor'],
      ['Período', safeText(filters.periodLabel || filters.period || 'Vista actual')],
      ['Tipo de período', safeText(filters.period || 'Vista actual')],
      ['Búsqueda', safeText(filters.query) || 'Sin búsqueda'],
      ['Categoría', safeText(filters.category) || 'Todas'],
      ['Tipo de movimiento', filters.type === 'expense' ? 'Gastos' : filters.type === 'income' ? 'Ingresos' : 'Todos'],
      ['Movimientos exportados', records.length],
      ['Alcance', 'Se exportaron todos los movimientos que coinciden con los filtros activos, sin limitarse a las tarjetas visibles en pantalla.'],
    ],
  };
};

// This is an analysis prompt, NEVER Markdown for the create/import transaction endpoint.
// Card details live in a separate subcollection and are not included here:
export const buildTransactionsLitaMarkdown = (docs = [], categories = [], now = new Date()) => {
  const source = Array.isArray(docs) ? docs : [];
  const expenses = new Set(categories.filter((entry) => entry?.isExpense).map((entry) => entry.name));
  const ordered = [...source].sort((a, b) => String(b.selectedDate || '').localeCompare(String(a.selectedDate || '')));
  const limit = 250;
  const shown = ordered.slice(0, limit);
  const lines = [
    '# LTC — Transacciones · contexto para Lita',
    '',
    `Generado: ${now.toISOString()}`,
    'Alcance: movimientos cargados en la vista actual de LTC, no todo el historial.',
    `Movimientos registrados en el período/vista: ${source.length}`,
    `Movimientos incluidos en este prompt: ${shown.length}`,
    ...(source.length > limit ? [`Advertencia: hay ${source.length - limit} movimientos omitidos por límite de longitud; no extrapoles los totales.`] : []),
    '',
    '## Reglas del análisis',
    '- Los importes etiquetados ARS y las cantidades USD NO se suman ni convierten sin cotización explícita.',
    '- Una compra/venta de divisas es conversión de activos, no ingreso o gasto ordinario.',
    '- Los pagos de resumen de tarjeta son UN movimiento: no sumes nuevamente los consumos individuales del PDF.',
    '- La clasificación sigue las categorías de LTC. Los movimientos sin datos suficientes se deben verificar.',
    '- Evitá inferir saldos bancarios, rentabilidad, pagos realizados o tasas actuales sin evidencia.',
    '- Si no se incluyen todos los movimientos, marcá el análisis como parcial.',
    '',
    '## Movimientos',
    '| Fecha | Nombre | Categoría | Tipo | ARS cargados | USD cantidad | Cotización ARS/USD |',
    '| --- | --- | --- | --- | ---: | ---: | ---: |',
  ];
  shown.forEach((row) => {
    const category = safeText(row.category);
    const amount = getAmount(row), usd = getQuantity(row);
    lines.push(`| ${safeText(row.selectedDate) || 'N/D'} | ${getName(row) || 'N/D'} | ${category || 'N/D'} | ${classification(row, expenses)} | ${amount ?? 'N/D'} | ${usd ?? 'N/D'} | ${conversion(category) && validMoney(row.currencyExchangeRate) ? Number(row.currencyExchangeRate) : 'N/D'} |`);
  });
  lines.push('', '## Pedido para Lita',
    'Analizá estos movimientos del período visible. Identificá categorías con mayor peso, patrones, anomalías y vencimientos que habría que revisar. Indicá datos incompletos y verificaciones pendientes. Separá monedas y movimientos de capital; no presentes estimaciones como hechos.',
    'No generes ni guardes transacciones nuevas automáticamente.');
  return lines.join('\n');
};

export const exportTransactionsXlsx = (docs = [], categories = [], filters = {}) => {
  exportWorkbookXlsx(buildTransactionsExportSheets(docs, categories, filters),
    `transacciones-ltc-${new Date().toISOString().slice(0, 10)}.xlsx`);
};
