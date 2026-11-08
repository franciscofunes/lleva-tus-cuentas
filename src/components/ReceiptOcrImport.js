import React, { useState } from 'react';
import LocalScreenshotOcr from './LocalScreenshotOcr';
import { parseReceiptOcrText } from '../utils/receiptOcr';

const fieldKeys = ['merchant', 'amount', 'date', 'documentNumber'];

/** Local OCR only fills a draft. Its parent form remains the sole save/approval boundary. */
export default function ReceiptOcrImport({ onApply, privacyHidden = false, disabled = false }) {
  const [unreadable, setUnreadable] = useState(null);

  const recognized = ({text}) => {
    if (privacyHidden || disabled) return;
    const suggestion = parseReceiptOcrText(text);
    const fields = Object.fromEntries(fieldKeys.filter((key) => suggestion[key] != null && suggestion[key] !== '')
      .map((key) => [key, suggestion[key]]));
    if (!Object.keys(fields).length) {
      setUnreadable(suggestion.sourceText);
      return;
    }
    setUnreadable(null);
    onApply({
      ...fields,
      currency: suggestion.currency,
      ...(fields.documentNumber ? {documentType: suggestion.documentType} : {}),
      ocrMissingFields: [!fields.merchant && 'comercio', fields.amount == null && 'importe', !fields.date && 'fecha']
        .filter(Boolean),
    });
  };

  return <section aria-label='Escanear ticket con IA local' className='space-y-3'>
    {privacyHidden ? <p role='status' className='text-sm text-amber-700 dark:text-amber-300'>Mostrá los importes para escanear y revisar tu ticket.</p> : <>
      <LocalScreenshotOcr allowCamera autoRead compact receiptMode onRecognized={recognized} disabled={disabled} privacyHidden={privacyHidden}/>
      {unreadable && <div role='status' className='space-y-2 rounded-lg border border-amber-400/60 p-2 text-sm text-amber-800 dark:text-amber-200'>
        <p>Esta foto no dejó datos confiables. Podés completar la compra a mano o probar otra imagen.</p>
        <details className='text-xs'>
          <summary className='min-h-[44px] cursor-pointer py-3 font-semibold'>Ver texto leído (opcional)</summary>
          <pre className='max-h-32 overflow-auto whitespace-pre-wrap break-words'>{unreadable}</pre>
        </details>
      </div>}
    </>}
  </section>;
}
