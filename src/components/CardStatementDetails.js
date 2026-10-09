import React, { useState } from 'react'
import { auth, firestore } from '../shared/config/firebase/firebase.config'

const formatAmount = (value, currency) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, minimumFractionDigits: 2,
}).format(Number(value || 0))

export default function CardStatementDetails({ expenseId }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statement, setStatement] = useState(null)
  const [items, setItems] = useState([])

  const toggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (statement || error || loading) return
    setLoading(true)
    try {
      const uid = auth.currentUser?.uid
      if (!uid || !expenseId) throw new Error('Iniciá sesión para ver el desglose.')
      const results = await firestore.collection('users').doc(uid)
        .collection('cardStatements').where('expenseId', '==', expenseId).limit(1).get()
      if (results.empty) {
        setError('No hay detalle PDF guardado. Podés agregarlo al editar este resumen.')
        return
      }
      const doc = results.docs[0]
      const details = await doc.ref.collection('items').orderBy('date', 'asc').get()
      setStatement(doc.data())
      setItems(details.docs.map((snapshot) => snapshot.data()))
    } catch (e) {
      setError(e.message || 'No se pudo consultar este resumen.')
    } finally { setLoading(false) }
  }
  return (
    <div className='mt-2 min-w-0 max-w-full'>
      <button type='button' aria-expanded={open} onClick={toggle}
        className='min-h-[42px] rounded-lg border border-purple-500/70 px-3 py-2 text-sm font-semibold text-purple-700 dark:text-purple-300'>
        {open ? 'Ocultar desglose de tarjeta' : 'Ver consumos del resumen'}
      </button>
      {open && (
        <div className='mt-2 max-w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'>
          {loading && <p role='status'>Cargando el desglose…</p>}
          {error && <p role='status'>{error}</p>}
          {statement && (
            <>
              <h4 className='font-extrabold'>Detalle importado · {statement.period}</h4>
              <div className='my-2 flex flex-wrap gap-x-4 gap-y-1 font-bold'>
                <span>{formatAmount(statement.totals.ARS, 'ARS')}</span>
                <span>{formatAmount(statement.totals.USD, 'USD')}</span>
              </div>
              <p className='mb-2 text-xs text-slate-600 dark:text-slate-300'>
                {items.length} operaciones vinculadas. No se suman de nuevo a tus gastos.
              </p>
              {statement.feesArs !== undefined && (
                <div className='mb-3 space-y-1 rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700'>
                  <p>Consumos ARS: {formatAmount(statement.purchases?.ARS, 'ARS')}</p>
                  <p>Comisiones ARS: {formatAmount(statement.feesArs, 'ARS')}</p>
                  <p>IVA / impuestos ARS: {formatAmount(statement.taxesArs, 'ARS')}</p>
                  <p>Saldo anterior pendiente ARS: {formatAmount(statement.previousCreditArs, 'ARS')}</p>
                </div>
              )}
              <div className='max-h-[45dvh] space-y-2 overflow-y-auto'>
                {items.map((item, index) => (
                  <div key={index} className='border-b border-slate-200 pb-2 dark:border-slate-700'>
                    <div className='flex flex-wrap justify-between gap-x-3 font-semibold'>
                      <span className='min-w-0 break-words'>{item.merchant}</span>
                      <span>{formatAmount(item.amount, item.currency)}</span>
                    </div>
                    <p className='text-xs text-slate-600 dark:text-slate-300'>
                      {item.date} · {item.category}
                      {item.installment ? ' · Cuota ' + item.installment : ''}
                      {!item.includeInAnalytics ? ' · Excluida del análisis' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
