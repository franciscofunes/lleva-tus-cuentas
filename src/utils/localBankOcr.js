// OCR is only a hint: candidates must be corrected and explicitly approved by the owner.
// Never infer a currency from a number alone or confuse a payment with card consumption.
const CLEAN = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const CONSUMPTION = /\b(?:consumos?|compras?|gastos?)\b/i;

function amountForCurrency(lines, currency) {
  const marker = currency === 'ARS'
    ? /\bARS\b|\bpesos?\b/i
    : /\bUSD\b|\bd[oó]lares?\b|U\$S|US\$/i;
  const candidates = [];
  lines.forEach((line, index) => {
    if (!CONSUMPTION.test(line) || !marker.test(line)) return;
    // Do not guess an amount from a different row or a multi-currency total.
    const next = lines[index + 1] || '';
    const inLine = line.match(/(?:ARS|USD|pesos?|d[oó]lares?|U\$S|US\$)\s*[:$]?\s*(-?\d[\d., ]*\d|\d)/i);
    const after = !inLine && /^\s*\$?\s*[\d., ]+\s*$/.test(next) ? next.trim() : '';
    const value = CLEAN(inLine?.[1] || after).replace(/\s/g, '');
    if (/^\d[\d.,]*$/.test(value)) candidates.push(value);
  });
  return candidates.length === 1 ? candidates[0] : '';
}

export function extractBankOcrHints(text) {
  const lines = String(text || '').split(/\r?\n/).map(CLEAN).filter(Boolean);
  const sourceDate = lines.find((line) => /(?:fecha\s+de\s+consulta|consultado\s+el)/i.test(line)) || '';
  let asOf = '';
  const iso = sourceDate.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const local = sourceDate.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/);
  if (iso) asOf = iso[1];
  else if (local) asOf = `${local[3]}-${local[2]}-${local[1]}`;
  return {
    asOf,
    currentConsumptionARS: amountForCurrency(lines, 'ARS'),
    currentConsumptionUSD: amountForCurrency(lines, 'USD'),
  };
}

export function extractBankChargeHint(text) {
  const lines = String(text || '').split(/\r?\n/).map(CLEAN).filter(Boolean);
  const matches = lines.map(line => {
    if (/\b(?:pago|transferencia|saldo|total|resumen|vencimiento|consumos?)\b/i.test(line)) return null;
    const date = line.match(/\b(20\d{2}-\d{2}-\d{2}|\d{2}\/\d{2}\/20\d{2})\b/);
    const value = line.match(/(?:ARS|USD|US\$|U\$S)\s*\$?\s*(\d[\d.,]*\d|\d)/i);
    if (!date || !value) return null;
    const merchant = CLEAN(line.replace(date[0],'').replace(value[0],'')).replace(/^[-·: ]+|[-·: ]+$/g,'');
    if (merchant.length < 2 || merchant.length > 100 || !/[a-záéíóúñ]/i.test(merchant)) return null;
    const currency = /USD|US\$|U\$S/i.test(value[0]) ? 'USD' : 'ARS';
    const local = date[1].match(/^(\d{2})\/(\d{2})\/(20\d{2})$/);
    return { merchant, purchaseDate:local ? `${local[3]}-${local[2]}-${local[1]}` : date[1],
      amount:value[1], currency };
  }).filter(Boolean);
  // Multiple rows may describe different purchases. Never silently choose one.
  return matches.length === 1 ? matches[0] : null;
}

export function cardPhotoToMarkdown({type, bank, card, asOf, ars, usd, merchant, purchaseDate, amount, currency, installments}) {
  const safe = (value) => CLEAN(value).replace(/[\r\n:]/g, ' ');
  const header = `- type: ${type}\n  banco: ${safe(bank)}\n  tarjeta: ${safe(card)}`;
  if (type === 'snapshot') {
    return [header, `  fechaConsulta: ${safe(asOf)}`,
      ars.trim() ? `  consumosARS: ${safe(ars)}` : '',
      usd.trim() ? `  consumosUSD: ${safe(usd)}` : ''].filter(Boolean).join('\n');
  }
  return [header, `  comercio: ${safe(merchant)}`, `  fechaCompra: ${safe(purchaseDate)}`,
    `  importe: ${safe(amount)}`, `  moneda: ${safe(currency)}`,
    `  cuotas: ${safe(installments || '1')}`].join('\n');
}
