import { auth, firestore } from '../shared/config/firebase/firebase.config'
import { LITA_CHAT_LOCALHOST, LITA_CHAT_VERCEL_URL } from '../shared/constants/urls.const'

const apiBase = process.env.NODE_ENV === 'development'
  ? LITA_CHAT_LOCALHOST : LITA_CHAT_VERCEL_URL
const moneyCents = (value) => {
  if (typeof value !== 'string' || !/^-?\d+\.\d{2}$/.test(value)) throw new Error('Importe del resumen inválido')
  return Math.round(Number(value) * 100)
}
const safe = (text, max = 120) => String(text || '').slice(0, max)
export const statementDocumentId = (sha) => {
  if (!/^[a-f0-9]{64}$/.test(sha || '')) throw new Error('Hash del PDF inválido')
  return sha
}

export async function analyzeStatementPdf(file) {
  if (!file || file.type !== 'application/pdf' || file.size > 4 * 1024 * 1024 || !file.size) {
    throw new Error('Elegí un PDF de hasta 4 MB.')
  }
  const current = auth.currentUser
  if (!current) throw new Error('Iniciá sesión para analizar el resumen.')
  const token = await current.getIdToken()
  const body = new FormData()
  body.append('pdf', file, 'statement.pdf')
  const response = await fetch(new URL('/api/card-statements/analyze', apiBase).toString(), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body,
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.result) throw new Error(data?.error || 'No se pudo analizar el PDF.')
  return data.result
}

/**
 * Do not write any individual purchase to users/{uid}/expenses: purchases
 * are details of the already counted credit-card statement expense.
 */
export async function getImportedStatement(uid, fileSha256) {
  const current = auth.currentUser
  if (!current || current.uid !== uid) throw new Error('Sesión inválida.')
  const ref = firestore.collection('users').doc(uid)
    .collection('cardStatements').doc(statementDocumentId(fileSha256))
  const doc = await ref.get()
  return doc.exists ? { id: doc.id, ...doc.data() } : null
}
export function verifyStatementDraft(draft) {
  if (!draft || draft.schema !== 'ltc.card-statement.v1' ||
      !draft.statement?.reconciliation?.ARS || !draft.statement?.reconciliation?.USD ||
      !Array.isArray(draft.items) || !draft.items.length || draft.items.length > 400) {
    throw new Error('El resumen no está conciliado; no puede guardarse.')
  }
  const sums = { ARS: 0, USD: 0 }
  draft.items.forEach((item) => {
    if (!['ARS', 'USD'].includes(item.currency) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      throw new Error('Fecha o moneda de compra inválida.')
    }
    sums[item.currency] += moneyCents(item.amount)
  })
  const purchasesArs = moneyCents(draft.statement.purchases.ARS)
  const purchasesUsd = moneyCents(draft.statement.purchases.USD)
  if (sums.ARS !== purchasesArs || sums.USD !== purchasesUsd) {
    throw new Error('La suma de consumos no coincide con el subtotal del PDF. Corregí los datos.')
  }
  // Reconcile the FULL bank balance too. Fees are not purchases, and
  // prior payments/credits must not become additional expenses.
  const adjustmentsArs = moneyCents(draft.statement.taxesArs || '0.00') +
    moneyCents(draft.statement.feesArs || '0.00') +
    moneyCents(draft.statement.previousCreditArs || '0.00')
  if (moneyCents(draft.statement.totals.ARS) !== purchasesArs + adjustmentsArs ||
      moneyCents(draft.statement.totals.USD) !== purchasesUsd) {
    throw new Error('El total del resumen no coincide con consumos, impuestos, cargos y créditos.')
  }
  return true
}

export async function saveReviewedStatement({ uid, expenseId, draft }) {
  const current = auth.currentUser
  if (!current || current.uid !== uid || !expenseId) throw new Error('Sesión o transacción inválida.')
  verifyStatementDraft(draft)
  const docId = statementDocumentId(draft.fileSha256)
  const userRef = firestore.collection('users').doc(uid)
  const expenseRef = userRef.collection('expenses').doc(expenseId)
  const statementRef = userRef.collection('cardStatements').doc(docId)
  const [existing, expense] = await Promise.all([statementRef.get(), expenseRef.get()])
  if (!expense.exists || !String(expense.data()?.category || '').includes('Resumen tarjeta')) {
    throw new Error('Vinculá el detalle a una transacción Resumen tarjeta existente.')
  }
  if (existing.exists && existing.data()?.expenseId !== expenseId) {
    throw new Error('Este PDF ya está importado en otra transacción de tu cuenta.')
  }
  const batch = firestore.batch()
  batch.set(statementRef, {
    schema: draft.schema,
    expenseId,
    fileSha256: docId,
    institution: safe(draft.statement.institution, 70),
    cardBrand: safe(draft.statement.cardBrand, 30),
    period: safe(draft.statement.period, 7),
    closingDate: draft.statement.closingDate,
    dueDate: draft.statement.dueDate,
    totals: { ARS: draft.statement.totals.ARS, USD: draft.statement.totals.USD },
    purchases: { ARS: draft.statement.purchases.ARS, USD: draft.statement.purchases.USD },
    minimumPaymentArs: draft.statement.minimumPaymentArs,
    taxesArs: draft.statement.taxesArs,
    ...(draft.statement.feesArs !== undefined ? { feesArs: draft.statement.feesArs } : {}),
    previousCreditArs: draft.statement.previousCreditArs,
    itemCount: draft.items.length,
    countedInCashFlow: false,
    approvedByUser: true,
    updatedAt: new Date(),
  })
  for (let index = 0; index < draft.items.length; index++) {
    const item = draft.items[index]
    const itemRef = statementRef.collection('items').doc(String(index + 1).padStart(4, '0'))
    batch.set(itemRef, {
      date: item.date,
      merchant: safe(item.merchant, 90),
      amount: item.amount,
      currency: item.currency,
      category: safe(item.suggestedCategory || 'Sin categorizar', 80),
      receipt: safe(item.receipt, 12),
      installment: item.installment ? safe(item.installment, 24) : null,
      sourcePage: Number(item.sourcePage) || null,
      type: 'purchase',
      includeInAnalytics: item.includeInAnalytics !== false,
      countedInCashFlow: false,
    })
  }
  await batch.commit()
  return docId
}
