/** Conservative receipt hints: suggestions only, never a financial record. */
const currencyTag = /\bUSD\b|US\$|U\$S|\bDOL(?:AR|ARES)\b/i;
const arsTag = /\bARS\b|\bPESOS?\b/i;
const moneyMatch = /(?:US\$|U\$S|\bUSD\b|\bARS\b|\$)?\s*(-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)(?!\d)/gi;

function toMoney(raw) {
  const value = String(raw).trim();
  if (value.startsWith('-')) return null;
  const separators = value.match(/[.,]/g) || [];
  let numeric = value;
  if (separators.length > 0) {
    const last = Math.max(value.lastIndexOf('.'), value.lastIndexOf(','));
    // A single group of exactly three trailing digits may be 1.000 or 1.000 USD.
    if (value.length - last - 1 === 3 && separators.length === 1) return null;
    if (value.length - last - 1 === 2) numeric = value.slice(0, last).replace(/[.,]/g, '') + '.' + value.slice(last + 1);
    else if (separators.length > 1) numeric = value.replace(/[.,]/g, '');
    else return null;
  }
  const result = Number(numeric);
  return Number.isSafeInteger(Math.round(result * 100)) && result > 0 ? Math.round(result * 100) / 100 : null;
}

function isoDate(value) {
  const match = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (!match) return null;
  const year = Number(match[3] || match[4]);
  const month = Number(match[2] || match[5]);
  const day = Number(match[1] || match[6]);
  const result = new Date(Date.UTC(year, month - 1, day));
  return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
}

export function parseReceiptOcrText(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 120);
  const candidates = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/\b(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE\s+TOTAL)\b/i.test(line) ||
        /\b(?:SUBTOTAL|DESCUENTO|AHORRO|PUNTOS|CAMBIO|IMPUESTO|IVA|PERCEPCION)\b/i.test(line)) continue;
    // OCR sometimes separates "TOTAL" and its amount onto consecutive lines.
    const amountText = /\d/.test(line) ? line.replace(/^.*?\b(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE\s+TOTAL)\b/i, '') : lines[i + 1] || '';
    const numbers = Array.from(amountText.matchAll(moneyMatch)).map((match) => toMoney(match[1])).filter((n) => n !== null);
    if (numbers.length === 1) {
      const currencyText = `${line} ${amountText}`;
      // A bare '$' may denote ARS or USD: do not guess the native currency.
      candidates.push({amount: numbers[0], currency: currencyTag.test(currencyText) ? 'USD' : arsTag.test(currencyText) ? 'ARS' : null});
    }
  }
  const amounts = [...new Set(candidates.map((candidate) => candidate.amount))];
  const amount = amounts.length === 1 ? amounts[0] : null;
  const currencies = [...new Set(candidates.filter((candidate) => candidate.amount === amount).map((candidate) => candidate.currency).filter(Boolean))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const dateCandidates = [...new Set(lines.filter((line) => /\bFECHA\b|\bEMISI[ÓO]N\b/i.test(line)).map(isoDate).filter(Boolean))];
  const date = dateCandidates.length === 1 ? dateCandidates[0] : null;
  const named = lines.find((line) => /^(?:COMERCIO|LOCAL|RAZ[ÓO]N\s+SOCIAL)\s*[:\-]/i.test(line));
  const header = named?.replace(/^[^:\-]+[:\-]\s*/, '') || lines.find((line) =>
    /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\wÁÉÍÓÚÜÑáéíóúüñ\s.'-]{2,35}$/.test(line) &&
    !/\b(?:TICKET|FACTURA|FECHA|CUIT|CONSUMIDOR|RESPONSABLE|TOTAL|CAJERO|PAGO|DEBITO|CREDITO)\b/i.test(line));
  const merchant = header?.trim().slice(0, 30) || null;
  const warnings = [];
  if (amount === null) warnings.push(amounts.length > 1 ? 'Se encontraron totales distintos. Elegí el correcto manualmente.' : 'No se detectó un total inequívoco. Ingresá el importe manualmente.');
  if (!currency) warnings.push('La moneda no se pudo confirmar. Revisá ARS/USD según la categoría.');
  if (!date) warnings.push('Revisá e ingresá la fecha del ticket.');
  return {merchant, amount, currency, date, warnings, sourceText: lines.join('\n')};
}
