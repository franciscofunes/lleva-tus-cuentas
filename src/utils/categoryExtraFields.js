// Version 1: controlled, optional metadata. These fields never change LTC's
// financial amounts, category meaning, due-date rules or currency conversions.
export const MAX_EXTRA_FIELDS = 3;

export const CATEGORY_EXTRA_FIELD_CATALOG = Object.freeze([
  { id: 'reference', label: 'Referencia / ID de operación', type: 'text', maxLength: 60 },
  { id: 'counterparty', label: 'Comercio o contraparte', type: 'text', maxLength: 80 },
  {
    id: 'paymentMethod', label: 'Medio de pago', type: 'select',
    options: [
      { value: 'transferencia', label: 'Transferencia' },
      { value: 'debito', label: 'Débito' },
      { value: 'credito', label: 'Crédito' },
      { value: 'efectivo', label: 'Efectivo' },
      { value: 'otro', label: 'Otro' },
    ],
  },
  { id: 'receiptNumber', label: 'Número de comprobante', type: 'text', maxLength: 60 },
  { id: 'operationDate', label: 'Fecha de operación adicional', type: 'date' },
]);

const BY_ID = Object.fromEntries(CATEGORY_EXTRA_FIELD_CATALOG.map((field) => [field.id, field]));

export const getCategoryExtraFields = (category) =>
  Array.isArray(category?.extraFieldIds)
    ? category.extraFieldIds.map((id) => BY_ID[id]).filter(Boolean).slice(0, MAX_EXTRA_FIELDS)
    : [];

export const validateCategoryExtraFields = (ids) => {
  if (!Array.isArray(ids)) return 'Los campos adicionales deben ser una lista.';
  if (ids.length > MAX_EXTRA_FIELDS) return `Elegí hasta ${MAX_EXTRA_FIELDS} campos adicionales.`;
  if (new Set(ids).size !== ids.length || ids.some((id) => !Object.hasOwn(BY_ID, id)))
    return 'Hay campos adicionales no permitidos o repetidos.';
  return null;
};

// Validates a single controlled option; no user-defined field identifiers or arbitrary JSON.
const isCalendarDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const sanitizeTransactionCustomDetails = (input, allowedIds) => {
  const invalidConfig = validateCategoryExtraFields(allowedIds);
  if (invalidConfig) throw new Error(invalidConfig);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result = {};
  for (const id of allowedIds) {
    const raw = input[id];
    if (raw === undefined || raw === null || raw === '') continue;
    if (typeof raw !== 'string') throw new Error('Los campos adicionales deben contener texto válido.');
    const value = raw.trim();
    if (!value) continue;
    const field = BY_ID[id];
    if (field.type === 'text' && (value.length > field.maxLength || /[\r\n<>]/.test(value)))
      throw new Error(`Valor inválido para ${field.label}.`);
    if (field.type === 'date' && !isCalendarDate(value))
      throw new Error(`Fecha inválida para ${field.label}.`);
    if (field.type === 'select' && !field.options.some((item) => item.value === value))
      throw new Error(`Opción inválida para ${field.label}.`);
    result[id] = value;
  }
  return result;
};

export const displayTransactionCustomDetails = (details = {}) =>
  CATEGORY_EXTRA_FIELD_CATALOG.flatMap((field) => {
    const value = details && typeof details === 'object' ? details[field.id] : undefined;
    if (typeof value !== 'string' || !value.trim()) return [];
    const label = field.type === 'select'
      ? field.options.find((item) => item.value === value)?.label
      : value;
    return label ? [{ id: field.id, label: field.label, value: label }] : [];
  });
