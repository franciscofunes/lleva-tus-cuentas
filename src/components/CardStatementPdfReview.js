import React, { useMemo, useRef, useState } from 'react'
import { FiUploadCloud, FiFileText, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'
import { analyzeStatementPdf } from '../services/cardStatementService'

const format = (amount, currency) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, minimumFractionDigits: 2,
}).format(Number(amount || 0))

const guessCategory = (merchant, names) => {
  const text = String(merchant || '').toLowerCase()
  const suggestions = [
    [/farmacity|farmacia|asoprofarma/, /salud|farmacia/i],
    [/dia tienda|diarco|express|super|autocervicio/, /hogar|supermercado|aliment/i],
    [/telecentro|metrogas|tuenti/, /servicios|telefon/i],
    [/pedidosya|burger king|wendys|mostaza|fan de pan|cafe|pastas/, /comida|gastronom|restaurante|aliment/i],
    [/didi|uber|combust|ypf|corredorvial/, /transporte|autom[oó]vil|movilidad|veh[ií]culo/i],
    [/disney|chatgpt|openai/, /suscrip|entretenimiento|servicios/i],
  ]
  for (const [merchantPattern, categoryPattern] of suggestions) {
    if (merchantPattern.test(text)) {
      const found = names.find((name) => categoryPattern.test(name))
      if (found) return found
    }
  }
  return 'Sin categorizar'
}

/** Intentionally a review form, not an automatic transaction import. */
export default function CardStatementPdfReview({ categories = [], onDraft, onApply, disabled = false }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [fileInfo, setFileInfo] = useState(null)
  const fileRef = useRef(null)
  const expenseCategories = useMemo(() => (categories || [])
    .filter((c) => c.isExpense && !String(c.name).includes('Resumen tarjeta'))
    .map((c) => c.name), [categories])

  const analyze = async (file) => {
    setError('')
    setDraft(null)
    onDraft(null)
    if (!file) return
    setFileInfo({ name: file.name, size: file.size })
    setState('loading')
    try {
      const extracted = await analyzeStatementPdf(file)
      if (!extracted?.statement?.reconciliation?.ARS || !extracted?.statement?.reconciliation?.USD) {
        throw new Error('Los totales no coinciden. No se puede importar.')
      }
      const reviewed = {
        ...extracted,
        items: extracted.items.map((item) => ({
          ...item,
          suggestedCategory: guessCategory(item.merchant, expenseCategories),
          includeInAnalytics: true,
        })),
      }
      setDraft(reviewed)
      onDraft(reviewed)
      setState('ready')
    } catch (e) {
      setState('error')
      setError(e.message || 'No se pudo analizar el PDF.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const editItem = (index, changes) => {
    const updated = { ...draft, items: draft.items.map((item, i) =>
      i === index ? { ...item, ...changes } : item) }
    setDraft(updated)
    onDraft(updated)
  }
  return (
    <section className='min-w-0 rounded-xl border border-purple-400/50 bg-purple-500/5 p-3 text-slate-900 dark:text-slate-100'>
      <h3 className='text-base font-extrabold'>Analizar resumen de tarjeta PDF</h3>
      <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>
        PDF de hasta 4 MB. Extraemos consumos, cuotas, fechas y totales; nunca creamos gastos adicionales por cada compra.
        Admite Visa Santander y Visa Gold Banco Ciudad (PDF digital). Los resultados requieren tu aprobación.
      </p>
      <input
        id='card-statement-pdf'
        ref={fileRef}
        type='file'
        accept='.pdf,application/pdf'
        aria-label='Elegir resumen bancario en PDF'
        disabled={state === 'loading' || disabled}
        onChange={(event) => analyze(event.target.files?.[0])}
        className='sr-only'
      />
      <div className='mt-3 min-w-0 rounded-xl border border-dashed border-purple-400/70 bg-white/50 p-3 text-center dark:border-purple-400/50 dark:bg-slate-900/50 sm:p-4'>
        <span aria-hidden='true' className='mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200'>
          {state === 'ready' ? <FiCheckCircle size={22}/> : <FiUploadCloud size={22}/>}
        </span>
        <p className='text-sm font-bold'>{fileInfo ? 'Resumen seleccionado' : 'Importá tu resumen desde el celular'}</p>
        <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>
          {fileInfo ? 'El archivo se analiza temporalmente y después se elimina.' : 'Elegí un archivo PDF descargado de tu home banking.'}
        </p>
        {fileInfo && (
          <div className='mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-left dark:border-slate-700 dark:bg-slate-800'>
            <FiFileText className='shrink-0 text-purple-700 dark:text-purple-300' size={20}/>
            <div className='min-w-0 flex-1'>
              <p className='break-all text-xs font-semibold'>{fileInfo.name}</p>
              <p className='text-xs text-slate-500 dark:text-slate-300'>{(fileInfo.size / 1024).toFixed(0)} KB · PDF</p>
            </div>
            {state === 'ready' && <FiCheckCircle className='shrink-0 text-emerald-600 dark:text-emerald-400' size={20}/>}
          </div>
        )}
        <button
          type='button'
          onClick={() => fileRef.current?.click()}
          disabled={state === 'loading' || disabled}
          aria-controls='card-statement-pdf'
          className='mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:cursor-not-allowed disabled:opacity-60'
        >
          {state === 'loading' ? (
            <><FiRefreshCw className='animate-spin' size={18}/> Analizando PDF…</>
          ) : fileInfo ? (
            <><FiRefreshCw size={18}/> Elegir otro PDF</>
          ) : (
            <><FiUploadCloud size={19}/> Seleccionar archivo PDF</>
          )}
        </button>
        <p className='mt-2 text-xs text-slate-500 dark:text-slate-300'>Máximo 4 MB · Visa Santander y Visa Gold Banco Ciudad</p>
      </div>
      {state === 'loading' && <p role='status' aria-live='polite' className='mt-3 text-sm'>Extrayendo y conciliando consumos, esperá…</p>}
      {error && <p role='alert' className='mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300'>{error}</p>}
      {draft && (
        <div className='mt-3 space-y-3'>
          <div className='grid grid-cols-1 gap-2 rounded-lg bg-white p-3 text-sm dark:bg-slate-900 sm:grid-cols-2'>
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Total ARS</span>
              <strong>{format(draft.statement.totals.ARS, 'ARS')}</strong></div>
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Total USD — sin conversión</span>
              <strong>{format(draft.statement.totals.USD, 'USD')}</strong></div>
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Cierre</span>
              <strong>{draft.statement.closingDate}</strong></div>
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Vencimiento</span>
              <strong>{draft.statement.dueDate}</strong></div>
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Consumos</span>
              <strong>{draft.items.length} operaciones</strong></div>
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Subtotal de consumos ARS</span>
              <strong>{format(draft.statement.purchases.ARS, 'ARS')}</strong></div>
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Impuestos y percepciones ARS</span>
              <strong>{format(draft.statement.taxesArs, 'ARS')}</strong></div>
            {draft.statement.feesArs !== undefined && (
              <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Comisiones y cargos ARS</span>
                <strong>{format(draft.statement.feesArs, 'ARS')}</strong></div>
            )}
            <div><span className='block text-xs text-slate-500 dark:text-slate-300'>Estado</span>
              <strong className='text-emerald-600 dark:text-emerald-400'>Totales conciliados</strong></div>
          </div>
          <button type='button' onClick={() => onApply(draft.statement)}
            className='w-full rounded-lg border border-purple-500 bg-purple-600 px-3 py-2.5 font-bold text-white hover:bg-purple-700'>
            Completar campos del formulario (revisar antes de guardar)
          </button>
          <button type='button' aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
            className='flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold dark:border-slate-600'>
            <span>Revisar y categorizar consumos ({draft.items.length})</span><span>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div className='max-h-[55dvh] space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-slate-300 p-2 dark:border-slate-600'>
              {draft.items.map((item, index) => (
                <div key={item.sourcePage + '-' + item.receipt + '-' + index}
                  className='min-w-0 rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <span className='min-w-0 flex-1 break-words font-bold'>{item.merchant}</span>
                    <strong className='break-words tabular-nums'>{format(item.amount, item.currency)}</strong>
                  </div>
                  <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>
                    {item.date} · Página {item.sourcePage}
                    {item.installment ? ' · Cuota ' + item.installment : ''}
                  </p>
                  <label className='mt-2 block text-xs font-semibold' htmlFor={'card-category-' + index}>
                    Categoría sugerida
                  </label>
                  <select id={'card-category-' + index} value={item.suggestedCategory}
                    onChange={(event) => editItem(index, { suggestedCategory: event.target.value })}
                    className='mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800'>
                    <option value='Sin categorizar'>Sin categorizar</option>
                    {expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <label className='mt-2 flex items-center gap-2 text-xs'>
                    <input type='checkbox' checked={item.includeInAnalytics !== false}
                      onChange={(event) => editItem(index, { includeInAnalytics: event.target.checked })}/>
                    Incluir en análisis de consumos (sin duplicar gastos)
                  </label>
                </div>
              ))}
            </div>
          )}
          <p className='rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'>
            El detalle queda vinculado al Resumen tarjeta cuando guardás la transacción. No se guarda el PDF.
            Cualquier compra individual queda excluida de los totales de movimientos.
          </p>
        </div>
      )}
    </section>
  )
}
