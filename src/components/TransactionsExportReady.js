import React, { useEffect, useRef, useState } from 'react';
import { FaDownload, FaFileCsv, FaFileExcel, FaFilePdf, FaShareAlt } from 'react-icons/fa';
import GenericModal from './GenericModal';
import { shareExportFile } from '../utils/shareExportFile';

/**
 * Download/share options are contained in a modal. No automatic file downloads,
 * no uploads, and no invisible failures on Android.
 */
function PreparedExportOptions({ prepared }) {
  const { filename, csvFilename, xlsxUrl, csvUrl, xlsxBlob, csvBlob, count, pdfSource } = prepared;
  const [shareFormat, setShareFormat] = useState('xlsx');
  const [pdfState, setPdfState] = useState({ status: 'idle' });
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const pdfUrlRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
  }, []);

  const pdfFilename = filename.replace(/\.xlsx$/, '.pdf');

  const preparePdf = async () => {
    if (pdfState.status === 'loading' || pdfState.status === 'ready') return;
    setFeedback('');
    setPdfState({ status: 'loading' });
    try {
      // Keep PDF rendering out of the initial Transactions route bundle.
      const { buildTransactionsPdf } = await import('../utils/transactionsPdf');
      const pdfBlob = buildTransactionsPdf(pdfSource.docs, pdfSource.categories, pdfSource.filters);
      if (!mountedRef.current) return;
      const url = URL.createObjectURL(pdfBlob);
      pdfUrlRef.current = url;
      setPdfState({ status: 'ready', blob: pdfBlob, url });
    } catch (error) {
      if (mountedRef.current) {
        console.warn('[ltc-export] PDF generation failed', error?.name || 'Error');
        setPdfState({ status: 'error' });
        setFeedback('No se pudo preparar el PDF. Podés descargar Excel o CSV e intentarlo nuevamente.');
      }
    }
  };

  const share = async () => {
    setFeedback('');
    const files = {
      xlsx: { blob: xlsxBlob, filename },
      csv: { blob: csvBlob, filename: csvFilename },
      pdf: pdfState.status === 'ready' ? { blob: pdfState.blob, filename: pdfFilename } : null,
    };
    const selected = files[shareFormat];
    if (!selected) {
      setFeedback('Primero tocá Preparar PDF. Luego elegí Compartir archivo.');
      return;
    }
    // Important: the actual navigator.share call is synchronous up to its
    // first await, preserving the tap's browser user activation.
    const sharingTask = shareExportFile({
      ...selected, title: 'LTC$ · Movimientos',
    });
    setSharing(true);
    const result = await sharingTask;
    if (!mountedRef.current) return;
    setSharing(false);
    if (result.status === 'unsupported') {
      setFeedback('Este navegador no admite compartir archivos de este formato. Descargalo y adjuntalo desde WhatsApp, Correo u otra aplicación.');
    } else if (result.status === 'failed') {
      setFeedback('Android no pudo abrir el selector para ese archivo. Probá con PDF o descargalo para adjuntarlo manualmente.');
    } else if (result.status === 'cancelled') {
      setFeedback('Se canceló el selector. El archivo sigue disponible para descargar.');
    } else {
      setFeedback('Archivo entregado al selector del sistema. Confirmá el envío en la aplicación elegida.');
    }
  };

  const actionStyle = 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition hover:border-purple-400 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

  return (
    <section role='region' aria-label='Archivo de transacciones preparado' className='space-y-4 pb-1'>
      <header className='pr-9'>
        <span aria-hidden='true' className='mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 font-extrabold text-violet-700 dark:text-violet-300'>LTC$</span>
        <h2 className='text-lg font-bold leading-snug text-slate-950 dark:text-slate-50'>Exportar movimientos</h2>
        <p className='mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
          {count} movimientos según los filtros seleccionados. Excel y CSV listos; PDF a pedido. Todo se genera en tu dispositivo, sin subir tus datos.
        </p>
      </header>

      <div className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800'>
        <p className='text-xs font-semibold text-slate-700 dark:text-slate-200'>Archivos listos · LTC$</p>
        <p className='mt-1 break-all text-xs text-slate-500 dark:text-slate-300'>{filename}</p>
      </div>

      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
        <a href={xlsxUrl} download={filename} className={actionStyle}>
          <FaFileExcel aria-hidden='true' /> <FaDownload aria-hidden='true' /> Descargar Excel
        </a>
        <a href={csvUrl} download={csvFilename} className={actionStyle}>
          <FaFileCsv aria-hidden='true' /> <FaDownload aria-hidden='true' /> Descargar CSV
        </a>
        {pdfState.status === 'ready' ? (
          <a href={pdfState.url} download={pdfFilename} className={actionStyle + ' sm:col-span-2'}>
            <FaFilePdf aria-hidden='true' /> <FaDownload aria-hidden='true' /> Descargar PDF
          </a>
        ) : (
          <button type='button' onClick={preparePdf} disabled={pdfState.status === 'loading'}
            className={actionStyle + ' sm:col-span-2 disabled:cursor-wait disabled:opacity-60'}>
            <FaFilePdf aria-hidden='true' /> {pdfState.status === 'loading' ? 'Preparando PDF…' : 'Preparar PDF'}
          </button>
        )}
      </div>

      <div className='space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
        <h3 className='text-sm font-bold text-slate-900 dark:text-white'>Compartir archivo</h3>
        <label htmlFor='ltc-share-format' className='block text-xs font-semibold text-slate-600 dark:text-slate-300'>
          Formato para compartir
        </label>
        <select id='ltc-share-format' value={shareFormat} onChange={(event) => { setShareFormat(event.target.value); setFeedback(''); }}
          className='min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'>
          <option value='pdf'>PDF {pdfState.status === 'ready' ? '(listo)' : '(preparar primero)'}</option>
          <option value='xlsx'>Excel (.xlsx)</option>
          <option value='csv'>CSV (.csv)</option>
        </select>
        <button type='button' onClick={share} disabled={sharing}
          className='inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60'>
          <FaShareAlt aria-hidden='true' /> {sharing ? 'Abriendo opciones…' : 'Compartir con otra aplicación'}
        </button>
        {feedback && <p role='status' className='rounded-lg bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-200'>{feedback}</p>}
        <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
          Android puede ofrecer WhatsApp, correo y otras aplicaciones. Instagram y Facebook pueden no aceptar documentos.
          Si no aparece tu aplicación, descargá el archivo y adjuntalo desde ella.
        </p>
      </div>
      <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
        Los archivos incluyen importes reales aunque estén ocultos en LTC$. Confirmá el destinatario antes de enviarlos.
        El botón de descarga no puede confirmar que el navegador haya guardado el archivo.
      </p>
    </section>
  );
}

export default function TransactionsExportReady({ prepared, onClose }) {
  if (!prepared) return null;
  return (
    <GenericModal component={PreparedExportOptions} prepared={prepared} show
      dialogLabel='Opciones de exportación' closeModal={onClose} />
  );
}
