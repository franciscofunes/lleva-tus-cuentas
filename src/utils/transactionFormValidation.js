// One decimal parser for the financial form. The browser's type=number
// rejects locale-formatted input and silently applies an integer step.
// This parser handles ARS/US punctuation without changing the user's draft.
export function parseTransactionNumber(raw, maxDecimals = 2) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  const input = String(raw).trim().replace(/\u00a0/g, ' ').replace(/\s/g, '')
    .replace(/^(?:ARS|USD|US\$|U\$S|\$)/i, '');
  if (!input || !/^\d[\d.,]*$/.test(input)) return null;
  let decimal = input;
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(input)) {
    decimal = input.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(input)) {
    decimal = input.replace(/,/g, '');
  } else if (maxDecimals <= 2 && /^\d{1,3}(?:\.\d{3})+$/.test(input)) {
    decimal = input.replace(/\./g, '');
  } else if (maxDecimals <= 2 && /^\d{1,3}(?:,\d{3})+$/.test(input)) {
    decimal = input.replace(/,/g, '');
  } else if (/^\d+(?:,\d+)?$/.test(input)) {
    decimal = input.replace(',', '.');
  } else if (!/^\d+(?:\.\d+)?$/.test(input)) {
    return null;
  }
  const fraction = decimal.split('.')[1] || '';
  if (fraction.length > maxDecimals) return null;
  const n = Number(decimal);
  return Number.isFinite(n) && n > 0 && n < 1e15 ? n : null;
}

export const isValidTransactionDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const dt = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === value;
};

export const validTransactionName = (value) =>
  typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 200 &&
  !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value);

// Description/comment is optional. It can include Unicode, paragraphs and
// receipt details. Firestore's document size is the underlying technical cap.
export const validTransactionComment = (value) =>
  value === undefined || value === null || typeof value === 'string';
