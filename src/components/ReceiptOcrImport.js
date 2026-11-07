import React, { useState } from 'react';
import LocalScreenshotOcr from './LocalScreenshotOcr';
import { parseReceiptOcrText } from '../utils/receiptOcr';

const fieldLabels = {merchant: 'Comercio', amount: 'Total del ticket', date: 'Fecha', documentNumber: 'N.º de ticket, cupón u operación'};
const fieldKeys = ['merchant', 'amount', 'date', 'documentNumber'];

/** Financial review boundary for receipts. OCR never writes or chooses a category. */
export default function ReceiptOcrImport({ onApply, privacyHidden = false, disabled = false }) {
  const [suggestion, setSuggestion] = useState(null);
  const [selected, setSelected] = useState({merchant: true, amount: true, date: true, documentNumber: true});

  const recognized = ({text}) => {
    setSuggestion(parseReceiptOcrText(text));
    setSelected({merchant: true, amount: true, date: true, documentNumber: true});
  };

  const apply = () => {
    if (!suggestion || privacyHidden || disabled) return;
    const fields = Object.fromEntries(fieldKeys.filter((key) => selected[key] && suggestion[key] !== null && suggestion[key] !== '').map((key) => [key, suggestion[key]]));
    if (!Object.keys(fields).length) return;
    onApply({...fields, currency: suggestion.currency, ...(fields.documentNumber ? {documentType: suggestion.documentType} : {})});
    setSuggestion(null);
  };

  const choices = fieldKeys.filter((key) => suggestion?.[key] !== null && suggestion?.[key] !== '');
  return <section aria-label='Escanear ticket con IA local' className='space-y-3'>
    {privacyHidden ? <p role='status' className='text-sm text-amber-700 dark:text-amber-300'>Mostrá los importes para escanear y revisar tu ticket.</p> : <>
      <p className='text-sm leading-relaxed text-slate-700 dark:text-slate-200'>Sacá una foto o elegí una imagen. El reconocimiento se hace en tu dispositivo; nada se guarda hasta confirmar el formulario.</p>
      <LocalScreenshotOcr allowCamera onRecognized={recognized} disabled={disabled} privacyHidden={privacyHidden}/>
      {suggestion && <div className='space-y-3 rounded-xl border border-violet-300 bg-violet-50/60 p-3 dark:border-violet-500/50 dark:bg-slate-900/70' aria-label='Revisar datos detectados del ticket'>
        <div>
          <h3 className='text-sm font-extrabold text-slate-900 dark:text-slate-50'>Revisá antes de aplicar</h3>
          <p className='mt-1 text-xs text-slate-700 dark:text-slate-200'>Elegí qué datos pasar al formulario. La categoría y la moneda se verifican manualmente.</p>
        </div>
        {choices.map((key) => <label key={key} className='flex min-w-0 items-start gap-3 text-sm text-slate-900 dark:text-slate-50'>
          <input type='checkbox' aria-label={`Aplicar ${fieldLabels[key]}`} checked={selected[key]} onChange={(event) => setSelected((current) => ({...current, [key]: event.target.checked}))} disabled={disabled} className='mt-1 h-5 w-5 shrink-0 accent-violet-600'/>
          <span className='min-w-0 flex-1 break-words'><span className='block font-semibold'>{fieldLabels[key]}</span>
            <span className='tabular-nums'>{key === 'amount' ? `${suggestion.currency || 'Moneda sin verificar'} ${suggestion.amount.toLocaleString('es-AR', {minimumFractionDigits: 2})}` : suggestion[key]}</span>
          </span>
        </label>)}
        {suggestion.warnings.length > 0 && <ul className='list-disc space-y-1 pl-5 text-xs text-amber-800 dark:text-amber-300'>
          {suggestion.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>}
        <details className='rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800'>
          <summary className='min-h-[44px] cursor-pointer py-3 font-semibold text-violet-700 dark:text-violet-200'>Ver texto leído y cotejar con el ticket</summary>
          <pre className='max-h-44 overflow-auto whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200'>{suggestion.sourceText}</pre>
        </details>
        <button type='button' onClick={apply} disabled={!choices.some((key) => selected[key]) || disabled}
          className='min-h-[44px] w-full rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:bg-violet-600'>Aplicar campos seleccionados</button>
        <p className='text-xs text-slate-600 dark:text-slate-300'>Después elegí una categoría de gasto y confirmá el importe y la moneda. No se crea ninguna transacción automáticamente.</p>
      </div>}
    </>}
  </section>;
}
