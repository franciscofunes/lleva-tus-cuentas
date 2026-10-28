// Conservative OCR adapter: it only reformats explicitly labeled screenshot values.
// In particular, balance changes are NEVER interpreted as investment earnings.
const LABELS = [
  ['valor de cuotaparte', 'Valor cuotaparte'],
  ['valor cuotaparte', 'Valor cuotaparte'],
  ['cantidad de cuotapartes', 'Cuotapartes'],
  ['cuotapartes', 'Cuotapartes'],
  ['saldo actual', 'Capital actual'],
  ['capital actual', 'Capital actual'],
  ['tasa anual', 'Tasa anual'],
  ['total ytd publicado', 'Total YTD publicado'],
  ['vencimiento', 'Vencimiento'],
  ['saldo', 'Saldo'],
];
const NUMBER = /^(?:(?:US\$|U\$S|ARS|USD|EUR|USDT|\$)\s*)?-?\d[\d.,]*(?:\s*%)?$/i;
const DATE = /^(?:20\d{2}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]20\d{2})$/;

export function preparePortfolioOcrText(source) {
  const text = String(source || '');
  const lines = text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const extracted = [];
  const seen = new Set();
  lines.forEach((line,index)=>{
    const lower=line.toLowerCase().replace(/\s+/g,' ');
    for (const [label,field] of LABELS) {
      if (seen.has(field)) continue;
      // Require an exact field label and one adjacent amount/date. No unlabeled assumptions.
      const adjacent = lower === label ? lines[index + 1] || '' : '';
      const inline = lower.startsWith(label + ' ') ? line.slice(label.length).trim().replace(/^[:=-]\s*/, '') : '';
      const value = (inline || adjacent).trim();
      if (!value || !(NUMBER.test(value) || (field === 'Vencimiento' && DATE.test(value)))) continue;
      extracted.push(`${field}: ${value}`);
      seen.add(field);
      break;
    }
  });
  if (!extracted.length) return text;
  // Keep the raw OCR text inspectable and editable; append only strictly labeled proposals.
  return `${text}\n\n# Campos sugeridos desde etiquetas visibles (revisar)\n${extracted.join('\n')}`;
}
