/** Conservative receipt hints: suggestions only, never a financial record. */
const currencyTag = /\bUSD\b|US\$|U\$S|\bDOL(?:AR|ARES)\b/i;
const arsTag = /\bARS\b|\bPESOS?\b/i;
const moneyMatch = /(?:US\$|U\$S|\bUSD\b|\bARS\b|\$)?\s*(-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)(?!\d)/gi;
const monthNames = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

function toMoney(raw) {
  const value = String(raw).trim();
  if (value.startsWith('-')) return null;
  const separators = value.match(/[.,]/g) || [];
  let numeric = value;
  if (separators.length > 0) {
    const last = Math.max(value.lastIndexOf('.'), value.lastIndexOf(','));
    // Within a labeled TOTAL, 18.034 is the common Argentine thousands notation.
    // Decimal values with three fractional digits are not valid receipt totals.
    if (value.length - last - 1 === 3 && separators.length === 1) numeric = value.replace(/[.,]/g, '');
    else if (value.length - last - 1 === 2) numeric = value.slice(0, last).replace(/[.,]/g, '') + '.' + value.slice(last + 1);
    else if (separators.length > 1) numeric = value.replace(/[.,]/g, '');
    else return null;
  }
  const result = Number(numeric);
  return Number.isSafeInteger(Math.round(result * 100)) && result > 0 ? Math.round(result * 100) / 100 : null;
}

const itemMeta = /\b(?:TOTAL|SUBTOTAL|FACTURA|CUIT|C[. ]?U[. ]?I[. ]?T|IVA|ART[IÍ]CULOS|DESCUENTO|IMPORTE|FECHA|HORA|OPERACI[ÓO]N|GRACIAS|EFECTIVO|PAGO|VENDEDOR|CAJERO|RECIB[IÍ]|COPIA|AUTORIZACI[ÓO]N|NRO|DIRECCI[ÓO]N|TEL[EÉ]FONO)\b/i;
const quantityPattern = /(\d{1,5}(?:[.,]\d{1,3})?)\s*(kg|kgr|gr|g|u|un|unidad(?:es)?)\b/i;

function extractItems(lines) {
  // Only read the item block, never treat authorization codes or totals as products.
  const itemHeader = lines.findIndex((line) => /\b(?:DESCRIPCI[ÓO]N|DETALLE\s+DE\s+(?:COMPRA|PRODUCTOS))\b/i.test(line));
  const firstTotal = lines.findIndex((line) => /^\s*(?:TOTAL|IMPORTE\s+TOTAL)\b/i.test(line));
  if (itemHeader < 0 && firstTotal < 0) return [];
  const end = firstTotal < 0 ? lines.length : firstTotal;
  const start = itemHeader >= 0 ? itemHeader + 1 : Math.max(0, end - 22);
  const items = [];
  for (let i = start; i < end && items.length < 30; i += 1) {
    const line = lines[i].replace(/^\s*\(?\d{1,6}\)?\s*[-–]\s*/, '').trim();
    if (!line || itemMeta.test(line) || /^(?:cantidad|precio\s+unit|importe|\d+[.,]?\d*\s*\$?)$/i.test(line)) continue;
    const hasLetters = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(line);
    if (!hasLetters) continue;
    const quantity = line.match(quantityPattern) || lines[i + 1]?.match(quantityPattern);
    const namePart = line.split(quantityPattern)[0].trim().replace(/\s*[-=]\s*$/, '');
    // Ordinary headers like DOCUMENTO NO FISCAL aren't products.
    if (!namePart || /\b(?:DOCUMENTO|FISCAL|COMERCIO|PRODUCTOS|CANTIDAD|PRECIO)\b/i.test(namePart)) continue;
    if (!quantity && !/\b(?:OFERTA|\d{2,}[.,]\d{2})\b/.test(line)) continue;
    const unitPrice = (quantity && `${line} ${lines[i + 1] || ''}`.match(/(\d{2,}(?:[.,]\d{2})?)\s*\$?\s*\/\s*(?:kg|kgr|u|un)/i)) || null;
    const amountLine = `${line} ${lines[i + 1] || ''} ${lines[i + 2] || ''}`;
    const afterEquals = amountLine.match(/=\s*\$?\s*(\d[\d.,]*)\s*\$?/);
    const parsedTotal = afterEquals ? toMoney(afterEquals[1]) : null;
    items.push({
      description: namePart.slice(0, 120),
      ...(quantity ? {quantity: Number(quantity[1].replace(',', '.'))} : {}),
      ...(unitPrice && toMoney(unitPrice[1]) !== null ? {unitPrice: toMoney(unitPrice[1])} : {}),
      ...(parsedTotal !== null ? {total: parsedTotal} : {}),
    });
    if (quantity && quantity.index === 0 && i + 1 < end) i += 1;
  }
  return items;
}

function isoDate(value) {
  const standard = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const local = value.match(/\b(\d{1,2})\s*[./-]\s*(\d{1,2}|[a-záéíóú]{3,10})\s*[./-]\s*(\d{2,4})\b/i);
  if (!standard && !local) return null;
  const rawYear = Number(standard?.[1] || local[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const rawMonth = standard?.[2] || local[2];
  const month = /[a-z]/i.test(rawMonth)
    ? monthNames[rawMonth.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 3)]
    : Number(rawMonth);
  const day = Number(standard?.[3] || local[1]);
  const result = new Date(Date.UTC(year, month - 1, day));
  return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
}

export function parseReceiptOcrText(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 120);
  const candidates = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/\b(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE\s+TOTAL|MONTO\s+(?:DE\s+)?(?:LA\s+)?(?:COMPRA|OPERACI[ÓO]N)|IMPORTE\s+(?:DE\s+)?(?:LA\s+)?(?:COMPRA|OPERACI[ÓO]N))\b/i.test(line) ||
        /\b(?:SUBTOTAL|DESCUENTO|AHORRO|PUNTOS|CAMBIO|IMPUESTO|IVA|PERCEPCION)\b/i.test(line)) continue;
    // OCR sometimes separates "TOTAL" and its amount onto consecutive lines.
    const amountText = /\d/.test(line)
      ? line.replace(/^.*?\b(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE\s+TOTAL|MONTO\s+(?:DE\s+)?(?:LA\s+)?(?:COMPRA|OPERACI[ÓO]N)|IMPORTE\s+(?:DE\s+)?(?:LA\s+)?(?:COMPRA|OPERACI[ÓO]N))\b/i, '')
      : lines[i + 1] || '';
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
  const dateCandidates = [...new Set(lines.flatMap((line, i) => {
    if (!/\bFECHA\b|\bEMISI[ÓO]N\b/i.test(line)) return [];
    return [isoDate(line) || isoDate(lines[i + 1] || '')].filter(Boolean);
  }))];
  const date = dateCandidates.length === 1 ? dateCandidates[0] : null;
  const named = lines.find((line) => /^(?:COMERCIO|LOCAL|RAZ[ÓO]N\s+SOCIAL)\s*[:-]/i.test(line));
  const header = named?.replace(/^[^:-]+[:-]\s*/, '') || lines.find((line) =>
    /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\wÁÉÍÓÚÜÑáéíóúüñ\s.'-]{2,50}$/.test(line) &&
    !/\b(?:DOCUMENTO|FISCAL|TICKET|CUP[ÓO]N|FACTURA|FECHA|HORA|CUIT|CUIL|CONSUMIDOR|RESPONSABLE|TOTAL|CAJERO|VENDEDOR|PAGO|DEBITO|CR[EÉ]DITO|DIRECCI[ÓO]N|TEL[EÉ]FONO|FAX|OPERACI[ÓO]N|ART[IÍ]CULOS|GRACIAS|RECIB[IÍ]|EFECTIVO|ORIGINAL|COPIA|COMPROBANTE|CUOTAS|AUTORIZACI[ÓO]N|TERMINAL|POS)\b/i.test(line));
  const merchant = header?.trim().slice(0, 30) || null;
  // A reference is optional. Never mistake CUIT, card number or authorization
  // codes for the receipt number unless the document names the reference.
  const documentLine = lines.find((line) => /\b(?:CUP[ÓO]N|FACTURA|OPERACI[ÓO]N|TICKET|RECIBO)\b[^\d\n]{0,22}\d[\d/-]{1,35}\b/i.test(line));
  const documentMatch = documentLine?.match(/\b(CUP[ÓO]N|FACTURA|OPERACI[ÓO]N|TICKET|RECIBO)\b[^\d\n]{0,22}(\d[\d/-]{1,35})\b/i);
  const documentNumber = documentMatch?.[2] || null;
  const documentType = /DOCUMENTO\s+NO\s+FISCAL/i.test(lines.join(' ')) ? 'non_fiscal'
    : documentMatch?.[1]
      ? /CUP[ÓO]N/i.test(documentMatch[1]) ? 'coupon' : /FACTURA/i.test(documentMatch[1]) ? 'invoice'
        : /RECIBO/i.test(documentMatch[1]) ? 'receipt' : 'ticket'
      : null;
  const operationNumber = lines.map((line) => line.match(/\bOPERACI[ÓO]N\s*(?:N[º°o.]?\s*)?[:#-]?\s*(\d[\d/-]{1,35})\b/i)?.[1]).find(Boolean) || null;
  const authorizationCode = lines.map((line) => line.match(/\bAUTORIZACI[ÓO]N\s*(?:N[º°o.]?\s*)?[:#-]?\s*(\d[\d/-]{1,35})\b/i)?.[1]).find(Boolean) || null;
  const items = extractItems(lines);
  const warnings = [];
  if (amount === null) warnings.push(amounts.length > 1 ? 'Se encontraron totales distintos. Elegí el correcto manualmente.' : 'No se detectó un total inequívoco. Ingresá el importe manualmente.');
  if (!currency) warnings.push('La moneda no se pudo confirmar. Revisá ARS/USD según la categoría.');
  if (!date) warnings.push('Revisá e ingresá la fecha del ticket.');
  return {merchant, amount, currency, date, documentNumber, documentType, operationNumber, authorizationCode, items, warnings, sourceText: lines.join('\n')};
}
