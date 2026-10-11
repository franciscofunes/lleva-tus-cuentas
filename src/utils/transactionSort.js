import { getTransactionCurrency } from './customCategories';
/**
 * Presentation-only ordering for Transactions.
 * Firestore records, filtered KPIs, exports and cross-currency values are untouched.
 */
export const TRANSACTION_SORT_OPTIONS = [
  { value: 'date', label: 'Fecha del movimiento' },
  { value: 'amount', label: 'Importe ARS' },
  { value: 'usd', label: 'Cantidad USD (divisas)' },
  { value: 'usdAmount', label: 'Importe USD' },
  { value: 'name', label: 'Nombre' },
  { value: 'category', label: 'Categoría' },
  { value: 'due', label: 'Vencimiento' },
];

const validKeys = new Set(TRANSACTION_SORT_OPTIONS.map((option) => option.value));
export const isTransactionSortKey = (key) => validKeys.has(key);

const collator = new Intl.Collator('es-AR', { sensitivity: 'base', numeric: true });

const numericValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const dateValue = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value?.toDate === 'function') return dateValue(value.toDate());
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'object' && Number.isFinite(value.seconds)) {
    return value.seconds * 1000;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const local = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (local) {
      const time = Date.UTC(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
      const date = new Date(time);
      return date.getUTCDate() === Number(local[1]) && date.getUTCMonth() === Number(local[2]) - 1
        ? time : null;
    }
    // Avoid accepting arbitrary browser-dependent date text.
    if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(trimmed)) return null;
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const textValue = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
};

const sortValue = (row, key) => {
  switch (key) {
    case 'amount': return getTransactionCurrency(row) === 'ARS' ? numericValue(row?.amount) : null;
    case 'usdAmount': return getTransactionCurrency(row) === 'USD' ? numericValue(row?.amount) : null;
    case 'usd': return numericValue(row?.currencyQuantity);
    case 'name': return textValue(row?.expenseName || row?.name);
    case 'category': return textValue(row?.category);
    case 'due': return dateValue(row?.selectedExpirationDate || row?.dueDate);
    default: return dateValue(row?.selectedDate || row?.date);
  }
};

/**
 * Missing or invalid field values stay LAST in either direction.
 * Equal values retain their original filtered order; never mutate the source.
 */
export const sortTransactions = (rows = [], key = 'date', direction = 'desc') => {
  if (!Array.isArray(rows)) return [];
  const safeKey = isTransactionSortKey(key) ? key : 'date';
  const multiplier = direction === 'asc' ? 1 : -1;
  return rows.map((row, index) => ({ row, index, value: sortValue(row, safeKey) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.index - b.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      const compare = typeof a.value === 'string'
        ? collator.compare(a.value, b.value)
        : a.value - b.value;
      return compare === 0 ? a.index - b.index : Math.sign(compare) * multiplier;
    })
    .map(({ row }) => row);
};
