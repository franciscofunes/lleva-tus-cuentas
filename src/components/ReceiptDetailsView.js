import React from 'react';
import { RECEIPT_LABELS, sanitizeReceiptDetails } from '../utils/receiptDetails';

export default function ReceiptDetailsView({value, hidden = false, currency = 'ARS'}) {
  const details = sanitizeReceiptDetails(value);
  if (hidden || !details) return null;
  return <div aria-label='Comprobantes de la compra' className='min-w-0 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'>
    {details.documents.map((document, index) => <p className='break-words' key={index}>
      <span className='font-bold text-violet-700 dark:text-violet-200'>{RECEIPT_LABELS[document.type]}: </span>
      {[document.number && `N.º ${document.number}`, document.operationNumber && `Operación ${document.operationNumber}`, document.authorizationCode && `Autorización ${document.authorizationCode}`].filter(Boolean).join(' · ')}
    </p>)}
    {details.items.length > 0 && <div className='space-y-1'>
      <p className='font-bold text-violet-700 dark:text-violet-200'>Productos ({details.items.length})</p>
      {details.items.map((item, index) => <p key={index} className='break-words'>
        {item.description}{item.quantity !== undefined ? ` · ${item.quantity}` : ''}
        {item.total !== undefined ? ` · ${currency === 'USD' ? 'USD' : 'ARS'} ${item.total.toLocaleString('es-AR')}` : ''}
      </p>)}
    </div>}
  </div>;
}
