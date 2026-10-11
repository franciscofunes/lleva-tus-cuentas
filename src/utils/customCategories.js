// One canonical category identity for global and per-user categories.
// Account-specific categories never overwrite a shared definition.
export const normalizeCategoryName = (value = '') =>
  String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR').replace(/\s+/g, ' ').trim();

const reservedCategoryLabels = [
  'resumen tarjeta', 'compra divisas', 'venta divisas', 'ingreso divisas',
];

// The original category name is a stable key used by historical Firestore
// expenses, filters, and financial calculations. Renames change ONLY its
// visible label, so no existing expense needs migration.
export const categoryLabel = (category) =>
  String(category?.displayName || category?.name || '').trim();

export const displayCategoryName = (canonicalName, categories = []) =>
  categoryLabel((categories || []).find((entry) => entry?.name === canonicalName)) ||
  String(canonicalName || '');

export const validateCategoryDisplayName = (name, categories = [], editingId = null) => {
  const clean = String(name || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 50)
    return 'Ingresá un nombre de entre 2 y 50 caracteres.';
  if (/[\r\n<>]/.test(clean))
    return 'El nombre contiene caracteres no permitidos.';
  const normalized = normalizeCategoryName(clean);
  if (reservedCategoryLabels.some((term) => normalized.includes(term)))
    return 'Este nombre está reservado para una categoría especial del sistema.';
  if ((categories || []).some((entry) =>
    entry.id !== editingId && [entry.name, entry.displayName]
      .some((label) => label && normalizeCategoryName(label) === normalized)))
    return 'Ya existe una categoría con ese nombre.';
  return null;
};

export const categoryDocumentId = (name) => {
  const normalized = normalizeCategoryName(name);
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'categoria';
  // Include original normalized Unicode in hash to distinguish names with emoji.
  let hash = 2166136261;
  for (const char of normalized) {
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  }
  return `${slug}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

// Legacy categories tagged 'due-date' used selectedDate as the due date.
// Keep that behavior for historical records. New categories preserve the
// transaction date and use the existing selectedExpirationDate field separately.
export const LEGACY_CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR = 'due-date';
export const CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR = 'separate-due-date';

export const validateCustomCategoryDateBehavior = (dateBehavior) =>
  dateBehavior === undefined || dateBehavior === null || dateBehavior === ''
    || dateBehavior === LEGACY_CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR
    || dateBehavior === CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR
    ? null
    : 'La configuración de vencimiento no es válida.';

export const validateCustomCategory = ({ name, isExpense }, categories = []) => {
  const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
  if (cleanName.length < 2 || cleanName.length > 50)
    return 'Ingresá un nombre de entre 2 y 50 caracteres.';
  if (/[\r\n<>]/.test(cleanName))
    return 'El nombre contiene caracteres no permitidos.';
  if (typeof isExpense !== 'boolean') return 'Elegí si es un gasto o ingreso.';
  return validateCategoryDisplayName(cleanName, categories);
};

export const mergeCategories = (shared = [], custom = []) => {
  const seen = new Set();
  return [...shared.map((entry) => ({ ...entry, origin: 'shared', active: true })),
    ...custom.map((entry) => ({ ...entry, origin: 'custom', isCustom: true }))].filter((category) => {
    const key = normalizeCategoryName(category?.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), 'es-AR'));
};

export const categoriesForNewTransactions = (categories = [], selected = '') =>
  categories.filter((entry) => entry.active !== false || entry.name === selected);
