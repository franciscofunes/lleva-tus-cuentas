// Receipt evidence belongs to a purchase, independent of its financial category.
// Keep this bounded and opt-in: OCR text and photographs are never persisted.
export const RECEIPT_TYPES = ['invoice', 'non_fiscal', 'coupon', 'ticket', 'receipt', 'unknown'];
export const RECEIPT_LABELS = {
  invoice: 'Factura', non_fiscal: 'Ticket no fiscal', coupon: 'Cupón de tarjeta',
  ticket: 'Ticket', receipt: 'Recibo', unknown: 'Comprobante',
};

const safeText = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\r\n<>]/g, ' ').slice(0, maxLength);
};

const safeNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  // Optional receipt metadata may contain a legacy Firestore map instead of a
  // scalar. Number(Object.create(null)) throws a TypeError during Card render.
  // Only persist and display primitive numeric values; never coerce objects.
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number < 1e12
    ? Math.round(number * 1000) / 1000 : undefined;
};
const safeDate = (value) => typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value ? value : '';

export const sanitizeReceiptDetails = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const documents = (Array.isArray(value.documents) ? value.documents : []).slice(0, 3)
    .filter((document) => document && typeof document === 'object' && !Array.isArray(document))
    .map((document) => ({
      type: RECEIPT_TYPES.includes(document.type) ? document.type : 'unknown',
      number: safeText(document.number, 60),
      operationNumber: safeText(document.operationNumber, 60),
      authorizationCode: safeText(document.authorizationCode, 60),
      issuedAt: safeDate(document.issuedAt),
    })).filter((document) => document.type !== 'unknown' || document.number || document.operationNumber || document.authorizationCode || document.issuedAt);
  const uniqueDocuments = documents.filter((document, index) => documents.findIndex((other) =>
    other.type === document.type && other.number === document.number &&
    other.operationNumber === document.operationNumber && other.authorizationCode === document.authorizationCode && other.issuedAt === document.issuedAt) === index);
  const items = (Array.isArray(value.items) ? value.items : []).slice(0, 30)
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      description: safeText(item.description, 120),
      ...(safeNumber(item.quantity) !== undefined ? { quantity: safeNumber(item.quantity) } : {}),
      ...(safeNumber(item.unitPrice) !== undefined ? { unitPrice: safeNumber(item.unitPrice) } : {}),
      ...(safeNumber(item.total) !== undefined ? { total: safeNumber(item.total) } : {}),
    })).filter((item) => item.description);
  return uniqueDocuments.length || items.length ? { documents: uniqueDocuments, items } : null;
};

export const mergeReceiptDetails = (existing, incoming) => {
  const previous = sanitizeReceiptDetails(existing);
  const next = sanitizeReceiptDetails(incoming);
  if (!next) return previous;
  // Another scan may be a coupon for the same purchase. Do not duplicate item lines.
  return sanitizeReceiptDetails({
    documents: [...(previous?.documents || []), ...next.documents],
    items: next.items.length ? next.items : (previous?.items || []),
  });
};
