import React, { useState } from 'react';
import { RECEIPT_LABELS, sanitizeReceiptDetails } from '../utils/receiptDetails';

const fieldStyle = 'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 sm:text-sm';

/** One shared optional evidence editor for cash expenses and card purchases. */
export default function ReceiptDetailsEditor({value, onChange, disabled = false}) {
  const [open, setOpen] = useState(false);
  const details = sanitizeReceiptDetails(value);
  const documents = details?.documents || [];
  const items = details?.items || [];
  const primary = documents[0] || {type: 'unknown', number: '', operationNumber: '', authorizationCode: ''};
  const updateDocument = (key, input) => onChange(sanitizeReceiptDetails({
    documents: [{...primary, [key]: input}, ...documents.slice(1)], items,
  }));
  const updateItems = (input) => onChange(sanitizeReceiptDetails({
    documents, items: input.split('\n').slice(0, 30).map((description, index) => ({
      ...(items[index] || {}), description,
    })).filter((item) => item.description.trim()),
  }));
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}
    className='rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70'>
    <summary className='flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-slate-800 dark:text-slate-100'>
      Comprobante y productos (opcional){documents.length || items.length ? ` · ${documents.length} comprobante(s), ${items.length} producto(s)` : ''}
    </summary>
    <div className='mt-2 space-y-3'>
      <p className='text-xs text-slate-600 dark:text-slate-300'>Podés registrar la compra sin foto ni número. Los datos detectados son editables.</p>
      <div className='grid gap-3 sm:grid-cols-2'>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>Tipo de comprobante
          <select className={fieldStyle} value={primary.type} disabled={disabled} onChange={(event) => updateDocument('type', event.target.value)}>
            {Object.entries(RECEIPT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>N.º de factura, ticket o cupón
          <input className={fieldStyle} maxLength={60} value={primary.number} disabled={disabled} onChange={(event) => updateDocument('number', event.target.value)} placeholder='Opcional'/>
        </label>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>N.º de operación
          <input className={fieldStyle} maxLength={60} value={primary.operationNumber} disabled={disabled} onChange={(event) => updateDocument('operationNumber', event.target.value)} placeholder='Opcional'/>
        </label>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>Código de autorización
          <input className={fieldStyle} maxLength={60} value={primary.authorizationCode} disabled={disabled} onChange={(event) => updateDocument('authorizationCode', event.target.value)} placeholder='Opcional'/>
        </label>
      </div>
      {documents.slice(1).map((document, index) => <p key={index} className='break-words text-xs text-slate-600 dark:text-slate-300'>Adicional: {RECEIPT_LABELS[document.type]} {document.number || document.operationNumber || document.authorizationCode}</p>)}
      <label className='block space-y-1 text-sm text-slate-700 dark:text-slate-200'>Productos (uno por línea, opcional)
        <textarea className={fieldStyle} rows={items.length ? Math.min(5, items.length + 1) : 2} maxLength={3900}
          disabled={disabled} value={items.map((item) => item.description).join('\n')}
          onChange={(event) => updateItems(event.target.value)} placeholder='El OCR completará este detalle cuando pueda leerlo'/>
      </label>
    </div>
  </details>;
}
