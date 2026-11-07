// Conservative OCR adapter: it only reformats explicitly labeled screenshot values.
// In particular, balance changes are NEVER interpreted as investment earnings.
const LABELS = [
  ['valor de cuotaparte', 'Valor cuotaparte'],
  ['valor cuotaparte', 'Valor cuotaparte'],
  ['cantidad de cuotapartes', 'Cuotapartes'],
  ['cuotapartes', 'Cuotapartes'],
  ['saldo actual', 'Capital actual'],
  ['capital actual', 'Capital actual'],
  ['tasa de interés nominal', 'Tasa anual'],
  ['tasa de interes nominal', 'Tasa anual'],
  ['tasa de interés efectiva', 'Tasa efectiva'],
  ['tasa de interes efectiva', 'Tasa efectiva'],
  ['intereses devengados a la fecha', 'Intereses devengados'],
  ['intereses devengados', 'Intereses devengados'],
  ['intereses totales previstos', 'Intereses totales previstos'],
  ['intereses totales', 'Intereses totales previstos'],
  ['interés total previsto', 'Intereses totales previstos'],
  ['interes total previsto', 'Intereses totales previstos'],
  ['número de contrato', 'Número de contrato'],
  ['numero de contrato', 'Número de contrato'],
  ['nro de contrato', 'Número de contrato'],
  ['renovación automática', 'Renovación automática'],
  ['renovacion automatica', 'Renovación automática'],
  ['tasa anual', 'Tasa anual'],
  ['fecha de valor', 'Fecha inicio'],
  ['moneda', 'Moneda'],
  ['total ytd publicado', 'Total YTD publicado'],
  ['vencimiento', 'Vencimiento'],
  ['saldo', 'Saldo'],
];
const NUMBER = /^(?:(?:US\$|U\$S|ARS|USD|EUR|USDT|\$)\s*)?-?\d[\d.,]*(?:\s*%)?$/i;
const DATE = /^(?:20\d{2}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-](?:20)?\d{2})$/;

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
      const inline = lower.startsWith(label) && /^[:=\s-]/.test(lower.slice(label.length))
        ? line.slice(label.length).trim().replace(/^[:=-]\s*/, '') : '';
      const value = (inline || adjacent).trim();
      const isDate = field === 'Vencimiento' || field === 'Fecha inicio';
      const isCurrency = field === 'Moneda';
      const isRenewal = field === 'Renovación automática';
      const isContract = field === 'Número de contrato';
      if (!value || !(isDate ? DATE.test(value)
        : isCurrency ? /^(ARS|USD|EUR|USDT)$/i.test(value)
          : isRenewal ? /^(sí|si|no)$/i.test(value)
            : isContract ? /^\d{3,24}$/.test(value) : NUMBER.test(value))) continue;
      extracted.push(`${field}: ${value}`);
      seen.add(field);
      break;
    }
  });
  if (!extracted.length) return text;
  // Keep the raw OCR text inspectable and editable; append only strictly labeled proposals.
  return `${text}\n\n# Campos sugeridos desde etiquetas visibles (revisar)\n${extracted.join('\n')}`;
}
