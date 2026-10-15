// Domain validation stays independent of React/Firebase for auditability.
// Bank identities are owner-created Firestore document IDs, not a fixed catalog.
export const validBankId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
export const validateBankName = (value) => {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 70) throw new Error('Ingresá un nombre de banco de 2 a 70 caracteres.');
  return name;
};
export const validDate = (value) => typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const length = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
export const parseAmount = (value, { canBeNegative = false } = {}) => {
  const text = String(value ?? '').trim();
  if (!/^-?\d{1,12}(?:\.\d{1,2})?$/.test(text)) throw new Error('Ingresá un importe válido con hasta dos decimales.');
  const amount = Number(text);
  if (!Number.isFinite(amount) || (!canBeNegative && amount < 0)) throw new Error('Importe inválido.');
  return amount;
};
export const validateBankAccount = (item) => {
  if (!validBankId(item.bankId)) throw new Error('Elegí un banco válido.');
  if (!length(item.name, 2, 70)) throw new Error('Ingresá el nombre de tu cuenta.');
  if (!['caja_ahorro', 'cuenta_corriente', 'otra'].includes(item.type)) throw new Error('Tipo de cuenta inválido.');
  if (!['ARS','USD'].includes(item.currency)) throw new Error('Moneda inválida.');
  if (item.alias && !length(item.alias, 1, 80)) throw new Error('Alias demasiado largo.');
  if (item.cbu && !/^\d{22}$/.test(item.cbu)) throw new Error('CBU/CVU debe tener 22 dígitos.');
  const extras = {};
  for (const [key, max] of [['accountNumber', 60], ['holder', 100], ['holderTaxId', 24], ['branch', 70]]) {
    const value = String(item[key] || '').trim();
    if (value.length > max) throw new Error('El campo ' + key + ' es demasiado largo.');
    if (key === 'holderTaxId' && value && !/^[0-9-]{8,24}$/.test(value)) throw new Error('CUIT/CUIL inválido.');
    if (value) extras[key] = value;
  }
  return { bankId: item.bankId, name: item.name.trim(), type: item.type, currency: item.currency,
    balance: parseAmount(item.balance, { canBeNegative: true }),
    alias: (item.alias || '').trim(), cbu: item.cbu || '', ...extras };
};
export const validateBankCard = (item) => {
  if (!validBankId(item.bankId)) throw new Error('Banco inválido.');
  if (!length(item.nickname, 2, 70)) throw new Error('Ingresá un nombre para la tarjeta.');
  if (!['Visa','Mastercard','Amex','Otra'].includes(item.brand)) throw new Error('Marca inválida.');
  if (item.lastFour && !/^\d{4}$/.test(item.lastFour)) throw new Error('Usá solo los últimos 4 dígitos.');
  for (const k of ['closingDay','dueDay']) {
    if (!Number.isInteger(Number(item[k])) || Number(item[k]) < 1 || Number(item[k]) > 31)
      throw new Error('El día de cierre o vencimiento debe estar entre 1 y 31.');
  }
  const snapshot = {};
  for (const key of ['closingDate', 'dueDate', 'asOf']) {
    const value = String(item[key] || '').trim();
    if (value && !validDate(value)) throw new Error('Fecha inválida: ' + key);
    if (value) snapshot[key] = value;
  }
  for (const key of ['lastStatementARS', 'lastStatementUSD', 'minimumPaymentARS',
    'currentConsumptionARS', 'currentConsumptionUSD', 'availableLimitARS']) {
    const value = String(item[key] ?? '').trim();
    if (value !== '') snapshot[key] = parseAmount(value);
  }
  return { bankId: item.bankId, nickname: item.nickname.trim(), brand: item.brand,
    lastFour: item.lastFour || '', closingDay: Number(item.closingDay), dueDay: Number(item.dueDay),
    ...(Object.keys(snapshot).length ? { statementSnapshot: snapshot } : {}) };
};
export const validateBankCharge = (item) => {
  if (!validBankId(item.bankId) || !length(item.cardId, 1, 128)) throw new Error('Seleccioná una tarjeta.');
  if (!length(item.merchant, 2, 100)) throw new Error('Ingresá el comercio.');
  if (!validDate(item.purchaseDate)) throw new Error('Fecha inválida.');
  if (!['ARS','USD'].includes(item.currency)) throw new Error('Moneda inválida.');
  if (!Number.isInteger(Number(item.installments)) || Number(item.installments) < 1 || Number(item.installments) > 60)
    throw new Error('Cantidad de cuotas inválida.');
  if ((item.note || '').length > 300) throw new Error('Nota demasiado larga.');
  return { bankId: item.bankId, cardId: item.cardId, merchant: item.merchant.trim(),
    purchaseDate: item.purchaseDate, currency: item.currency, amount: parseAmount(item.amount),
    installments: Number(item.installments), note: (item.note || '').trim(),
    source: 'manual', countedInCashFlow: false };
};
export const isStatementCategory = (category) => /Resumen tarjeta/i.test(String(category || ''));
export const sumBankBalances = (accounts, bankId = null) => (Array.isArray(accounts) ? accounts : [])
  .filter((a) => bankId === null || a.bankId === bankId)
  .reduce((totals, account) => {
    if (['ARS','USD'].includes(account.currency) && Number.isFinite(Number(account.balance)))
      totals[account.currency] += Number(account.balance);
    return totals;
  }, { ARS: 0, USD: 0 });
export const statementForCard = (statements, links, cardId) =>
  (Array.isArray(statements) ? statements : []).filter((s) =>
    (Array.isArray(links) ? links : []).some((l) => l.expenseId === s.expenseId && l.cardId === cardId));
