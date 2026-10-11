// Shared UTF-8 CSV serializer for every LTC$ export. Keep finance inputs as
// literal cell contents (never spreadsheets formulas).
const csvCell = (cell) => {
  if (typeof cell === 'number' && Number.isFinite(cell)) return String(cell);
  const raw = String(cell ?? '');
  const safe = /^\s*[=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
};

export const exportCsvRows = (rows, { brand = true } = {}) => {
  const source = Array.isArray(rows) ? rows : [];
  const branded = brand
    ? source.map((row, index) => [...row, index === 0 ? 'Origen' : 'LTC$'])
    : source;
  // Semicolon matches Excel's common Argentinian CSV import default.
  return '\uFEFF' + branded.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
};
