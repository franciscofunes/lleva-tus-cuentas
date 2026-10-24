import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COLLAPSIBLE_SURFACE_STYLES, FINANCIAL_RECORD_DISCLOSURE_STYLES } from './CollapsibleHeading'
import { FiSearch } from 'react-icons/fi'
import { filterCardStatementItems } from '../utils/cardStatementSearch'
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
  const [search, setSearch] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const pendingRef = useRef(false)
  const requestRef = useRef(0)
  const visibleItems = useMemo(() => filterCardStatementItems(items, search)
    .filter(item => currencyFilter === 'all' || item.currency === currencyFilter),
    [items, search, currencyFilter])

  useEffect(() => {
    // Navigating to another expense or unmounting (e.g. banking privacy
    // activated) invalidates outstanding Firestore reads.
    setOpen(false)
    setStatement(null)
    setItems([])
    setError('')
    setLoading(false)
    setSearch('')
    setCurrencyFilter('all')
    return () => { requestRef.current += 1; pendingRef.current = false }
  }, [expenseId])

  const load = async () => {
    if (pendingRef.current || statement) return
    pendingRef.current = true
    const requestId = ++requestRef.current
    setError('')
    setLoading(true)
    try {
      const uid = auth.currentUser?.uid
      if (!uid || !expenseId) throw new Error('unauthorized')
      const results = await firestore.collection('users').doc(uid)
        .collection('cardStatements').where('expenseId', '==', expenseId).limit(1).get()
      if (requestId !== requestRef.current) return
      if (results.empty) {
        setError('No hay un detalle PDF guardado para este resumen.')
        return
      }
      const doc = results.docs[0]
      const details = await doc.ref.collection('items').orderBy('date', 'asc').get()
      if (requestId !== requestRef.current || auth.currentUser?.uid !== uid) return
      setStatement(doc.data())
      setItems(details.docs.map((snapshot) => snapshot.data()))
    } catch (cause) {
      if (requestId === requestRef.current) {
        setError(cause?.message === 'unauthorized'
          ? 'Iniciá sesión para consultar el desglose.'
          : 'No se pudo consultar el PDF. Revisá la conexión y volvé a intentar.')
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
        pendingRef.current = false
      }
    }
  }
  const toggle = () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (!statement) load()
  }
  return (
    <div className='mt-2 min-w-0 max-w-full'>
      <button type='button' aria-expanded={open} onClick={toggle}
        className={FINANCIAL_RECORD_DISCLOSURE_STYLES + ' border border-slate-300 px-3 dark:border-slate-600'}>
        {open ? 'Ocultar desglose de tarjeta' : 'Ver consumos del resumen'}
      </button>
      {open && (
        <div className={COLLAPSIBLE_SURFACE_STYLES.nested + ' mt-2 max-w-full p-3 text-sm text-slate-800 dark:text-slate-100'}>
          {loading && <p role='status'>Cargando el desglose…</p>}
          {error && <div className='flex flex-wrap items-center gap-2'>
            <p role='alert' className='min-w-0 flex-1 text-rose-700 dark:text-rose-300'>{error}</p>
            <button type='button' onClick={load} disabled={loading}
              className='inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:text-violet-200'>
              Reintentar consulta
            </button>
          </div>}
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
              <div className='mb-3 flex flex-wrap items-center gap-2' role='group' aria-label='Filtrar consumos por moneda'>
                {[
                  ['all','Todos'],
                  ['ARS','ARS'],
                  ['USD','USD'],
                ].map(([currency, label]) => (
                  <button key={currency} type='button' aria-pressed={currencyFilter === currency}
                    aria-label={'Filtrar consumos: ' + label}
                    onClick={() => setCurrencyFilter(currency)}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${currencyFilter === currency
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className='relative mb-2'>
                <FiSearch aria-hidden='true' className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400' />
                <input
                  type='search'
                  aria-label='Buscar consumos del resumen'
                  placeholder='Buscar comercio, categoría o importe'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoComplete='off'
                  className='min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400'
                />
              </div>
              {(search.trim() || currencyFilter !== 'all') && (
                <p role='status' className='mb-2 text-xs text-slate-600 dark:text-slate-300'>
                  {visibleItems.length} de {items.length} consumos encontrados
                </p>
              )}
              <div className='max-h-[45dvh] space-y-2 overflow-y-auto'>
                {visibleItems.length === 0 && (search.trim() || currencyFilter !== 'all') && (
                  <p className='py-3 text-center text-sm text-slate-600 dark:text-slate-300'>No se encontraron consumos.</p>
                )}
                {visibleItems.map((item, index) => (
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
