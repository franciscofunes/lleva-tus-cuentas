// The planner is deliberately read-only. Statement payments and currency sales
// are separate operations and must never create expenses from a simulation.
// All monetary calculations are performed in integer cents.
export function parsePlannerCents(value) {
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return 0;
  if (!/^[\d.,]+$/.test(raw)) return null;
  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  const decimalIndex = Math.max(lastDot, lastComma);
  const separator = raw[decimalIndex];
  const occurrences = separator ? raw.split(separator).length - 1 : 0;
  const fraction = decimalIndex < 0 ? '' : raw.slice(decimalIndex + 1);
  // A repeated separator, or a single separator followed by three digits,
  // means grouped thousands rather than a fractional amount.
  const groupedOnly = (occurrences > 1 && !raw.includes(separator === '.' ? ',' : '.'))
    || (occurrences === 1 && fraction.length === 3 && !raw.includes(separator === '.' ? ',' : '.'));
  const normalized = groupedOnly ? raw.replace(/[.,]/g, '')
    : raw.slice(0, decimalIndex < 0 ? raw.length : decimalIndex).replace(/[.,]/g, '')
      + (decimalIndex < 0 ? '' : '.' + fraction);
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, cents = ''] = normalized.split('.');
  const result = Number(whole) * 100 + Number(cents.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}

export const formatPlannerMoney = (cents, currency) => currency + ' ' + new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(cents / 100);

export function calculateCardPaymentPlan({
  statements = [], availableArs = '0', availableUsd = '0', fxAvailableUsd = '',
  rateArsPerUsd = '', payUsdInKind = true, deductPerceptions = false,
  sameUsdSource = false,
}) {
  const arsCents = parsePlannerCents(availableArs);
  const usdCents = parsePlannerCents(availableUsd);
  const fxCents = fxAvailableUsd === '' ? null : parsePlannerCents(fxAvailableUsd);
  const rateCents = parsePlannerCents(rateArsPerUsd);
  if ([arsCents, usdCents].some((value) => value === null)
    || (fxAvailableUsd !== '' && fxCents === null))
    return { error: 'Revisá los saldos: ingresá importes positivos con hasta dos decimales.' };
  if (rateCents === null || rateCents <= 0)
    return { error: 'Ingresá una cotización de venta USD → ARS válida.' };
  if (!statements.length) return { error: 'Elegí al menos una tarjeta para planificar el pago.' };

  let totalArsCents = 0;
  let totalUsdCents = 0;
  let requestedPerceptionCents = 0;
  for (const statement of statements) {
    const ars = parsePlannerCents(statement.amountArs);
    const usd = parsePlannerCents(statement.amountUsd);
    const perception = parsePlannerCents(statement.perceptionArs);
    if ([ars, usd, perception].some((value) => value === null) || perception > ars)
      return { error: 'Revisá los importes de las tarjetas y sus percepciones.' };
    totalArsCents += ars;
    totalUsdCents += usd;
    requestedPerceptionCents += perception;
    if (!Number.isSafeInteger(totalArsCents + totalUsdCents + requestedPerceptionCents))
      return { error: 'Los importes superan el límite admitido.' };
  }
  const missingUsdCents = Math.max(0, totalUsdCents - (payUsdInKind ? usdCents : 0));
  const canDeductPerceptions = deductPerceptions && payUsdInKind && missingUsdCents === 0
    && statements.every((statement) => !parsePlannerCents(statement.perceptionArs)
      || parsePlannerCents(statement.amountUsd) > 0);
  const deductedCents = canDeductPerceptions ? requestedPerceptionCents : 0;
  const dueArsCents = totalArsCents - deductedCents;
  const missingArsCents = Math.max(0, dueArsCents - arsCents);
  // 1 USD cent at a quote of rateCents ARS cents/USD buys rateCents / 100 ARS cents.
  const sellUsdCents = Math.ceil(missingArsCents * 100 / rateCents);
  const proceedsArsCents = Math.round(sellUsdCents * rateCents / 100);
  const effectiveFxCents = fxCents === null ? null :
    Math.max(0, fxCents - (sameUsdSource && payUsdInKind ? totalUsdCents : 0));
  return {
    totalArsCents, totalUsdCents, requestedPerceptionCents, deductedCents,
    dueArsCents, availableArsCents: arsCents, availableUsdCents: usdCents,
    missingArsCents, missingUsdCents, sellUsdCents, proceedsArsCents,
    remainingArsCents: arsCents + proceedsArsCents - dueArsCents,
    remainingUsdCents: payUsdInKind ? Math.max(0, usdCents - totalUsdCents) : usdCents,
    fxAvailableUsdCents: effectiveFxCents,
    insufficientFx: effectiveFxCents !== null && sellUsdCents > effectiveFxCents,
    perceptionNotApplied: deductPerceptions && requestedPerceptionCents > 0 && !canDeductPerceptions,
  };
}
