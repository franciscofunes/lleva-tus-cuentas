const FIELD_ALIASES = {
  name: 'name', expenseName: 'name', nombre: 'name',
  category: 'category', categoria: 'category',
  date: 'selectedDate', selectedDate: 'selectedDate', fecha: 'selectedDate',
  currencyQuantity: 'currencyQuantity', cantidadDivisas: 'currencyQuantity', amountUsd: 'currencyQuantity',
  currencyExchangeRate: 'currencyExchangeRate', cotizacion: 'currencyExchangeRate', tipoCambio: 'currencyExchangeRate',
  amount: 'amount', monto: 'amount',
  comment: 'comment', description: 'comment', descripcion: 'comment',
  institution: 'institution', institucion: 'institution',
  period: 'period', periodo: 'period',
  source: 'source', fuente: 'source',
  selectedExpirationDate: 'selectedExpirationDate', dueDate: 'selectedExpirationDate', vencimiento: 'selectedExpirationDate',
  selectedCloseDate: 'selectedCloseDate', closingDate: 'selectedCloseDate', cierre: 'selectedCloseDate',
};

const clean = (value = '') => value.trim().replace(/^['"]|['"]$/g, '');
const isCurrencyCategory = (category) => /(?:Compra|Venta|Ingreso) divisas/i.test(category || '');
const isExchange = (category) => /(?:Compra|Venta) divisas/i.test(category || '');
const isCardStatement = (category) => /Resumen tarjeta/i.test(category || '');
const isValidDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const parsed = new Date(date + 'T12:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};
const positiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const transactionImportKey = (item) => {
  // Preserve existing divisas fingerprints to prevent importing past statements twice.
  if (isCurrencyCategory(item.category)) {
    return [item.institution, item.period, item.category, Number(item.currencyQuantity || 0).toFixed(8)]
      .map((v) => String(v || '').trim().toLowerCase()).join('|');
  }
  return ['ltc-transaction-v2', item.selectedDate, item.category, item.name, Number(item.amount || 0).toFixed(2), item.selectedExpirationDate]
    .map((v) => String(v || '').trim().toLowerCase()).join('|');
};

export const parseTransactionsMarkdown = (markdown) => {
  const rows = [];
  let current = null;
  String(markdown || '').split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    // A new "- name:" item starts the next transaction, not other nested fields.
    if (/^-\s+(?:name|expenseName|nombre)\s*:/i.test(line)) {
      if (current && Object.keys(current).length) rows.push(current);
      current = {};
    }
    const match = line.match(/^-?\s*([\wÁÉÍÓÚáéíóúÑñ]+)\s*:\s*(.*)$/);
    if (!match) return;
    if (!current) current = {};
    const field = FIELD_ALIASES[match[1]];
    if (field) current[field] = clean(match[2]);
  });
  if (current && Object.keys(current).length) rows.push(current);

  return rows.map((row, index) => {
    const category = row.category || 'Ingreso divisas';
    const divisas = isCurrencyCategory(category);
    const exchange = isExchange(category);
    const quantity = row.currencyQuantity === undefined || row.currencyQuantity === '' ? '' : Number(row.currencyQuantity);
    const rate = row.currencyExchangeRate === undefined || row.currencyExchangeRate === '' ? '' : Number(row.currencyExchangeRate);
    const derivedAmount = exchange && positiveNumber(quantity) && positiveNumber(rate)
      ? Math.round(Number(quantity) * Number(rate) * 100) / 100 : '';
    const amount = row.amount === undefined || row.amount === '' ? derivedAmount : Number(row.amount);

    const item = {
      name: row.name || (divisas ? `Rendimiento ${row.institution || ''}`.trim() : ''),
      category,
      selectedDate: row.selectedDate || '',
      selectedExpirationDate: row.selectedExpirationDate || '',
      selectedCloseDate: row.selectedCloseDate || '',
      currencyQuantity: quantity,
      currencyExchangeRate: rate,
      amount,
      comment: row.comment || (divisas ? `Rendimiento ${row.institution || ''} ${row.period || ''}`.trim() : ''),
      institution: row.institution || '',
      period: row.period || (row.selectedDate ? row.selectedDate.slice(0, 7) : ''),
      source: row.source || 'markdown-import',
    };
    const errors = [];
    if (!isValidDate(item.selectedDate)) errors.push('Fecha inválida');
    if (!item.name.trim()) errors.push('Falta nombre');
    if (!item.category.trim()) errors.push('Falta categoría');
    if (divisas && !positiveNumber(item.currencyQuantity)) errors.push('Cantidad de divisas inválida');
    if ((exchange && !positiveNumber(item.currencyExchangeRate)) ||
      (row.currencyExchangeRate !== undefined && row.currencyExchangeRate !== '' && !positiveNumber(rate))) errors.push('Cotización inválida');
    if (!divisas && !positiveNumber(item.amount)) errors.push('Monto inválido');
    if (exchange && !positiveNumber(item.amount)) errors.push('Monto inválido');
    if (row.amount !== undefined && row.amount !== '' && !positiveNumber(item.amount)) errors.push('Monto inválido');
    if (isCardStatement(category)) {
      if (!isValidDate(item.selectedExpirationDate)) errors.push('Vencimiento inválido');
      if (!isValidDate(item.selectedCloseDate)) errors.push('Cierre inválido');
    }
    if (item.selectedExpirationDate && !isValidDate(item.selectedExpirationDate)) errors.push('Vencimiento inválido');
    if (item.selectedCloseDate && !isValidDate(item.selectedCloseDate)) errors.push('Cierre inválido');
    return { ...item, importKey: transactionImportKey(item), errors: [...new Set(errors)], selected: errors.length === 0, row: index + 1 };
  });
};
