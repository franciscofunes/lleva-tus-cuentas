// Firestore's legacy/imported fields are not guaranteed to be primitives.
// Do not coerce arbitrary objects: Number(Object.create(null)) and
// String(Object.create(null)) throw, which can crash the whole dashboard.
// These are view-only readers; they never rewrite persisted transactions.
export const finiteTransactionNumber = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const transactionText = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};
