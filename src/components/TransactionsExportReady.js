import React from 'react';
import { FaDownload, FaFileCsv, FaFileExcel, FaShareAlt } from 'react-icons/fa';
import GenericModal from './GenericModal';

/**
 * The export options live in an overlay, never as a new dashboard widget.
 * Object URLs remain valid until the user dismisses the modal or the active
 * filters/data change; the Dashboard owns their revocation.
 */
function PreparedExportOptions({ prepared }) {
  const { filename, csvFilename, xlsxUrl, csvUrl, xlsxBlob, count } = prepared;
  const canShare = typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' && typeof File !== 'undefined' &&
    (typeof navigator.canShare !== 'function' ||
      navigator.canShare({ files: [new File([xlsxBlob], filename, { type: xlsxBlob.type })] }));

  const share = async () => {
    try {
      const file = new File([xlsxBlob], filename, { type: xlsxBlob.type });
      await navigator.share({ files: [file], title: 'Movimientos de LTC' });
    } catch (error) {
      // Canceling the Android share sheet is not a failure.
      if (error?.name !== 'AbortError') {
        console.warn('[ltc-export] No se pudo compartir el archivo', error);
      }
    }
  };

  return (
    <section role='region' aria-label='Archivo de transacciones preparado' className='space-y-4 pb-1'>
      <header className='pr-9'>
        <span className='mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'>
          <FaFileExcel size={17} aria-hidden='true' />
        </span>
        <h2 className='text-lg font-bold leading-snug text-slate-950 dark:text-slate-50'>
          Exportar movimientos
        </h2>
        <p className='mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
          {count} movimientos según los filtros seleccionados. El archivo se prepara en tu dispositivo, sin subir tus datos.
        </p>
      </header>

      <div className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800'>
        <p className='text-xs font-semibold text-slate-700 dark:text-slate-200'>Archivo preparado</p>
        <p className='mt-1 break-all text-xs text-slate-500 dark:text-slate-300'>{filename}</p>
      </div>

      <div className='flex flex-col gap-2'>
        <a href={xlsxUrl} download={filename}
          className='inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-violet-600 dark:hover:bg-violet-500 dark:focus-visible:ring-offset-slate-900'>
          <FaFileExcel aria-hidden='true' /><FaDownload aria-hidden='true' /> Descargar Excel
        </a>
        <a href={csvUrl} download={csvFilename}
          className='inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'>
          <FaFileCsv aria-hidden='true' /> Descargar CSV
        </a>
        {canShare && (
          <button type='button' onClick={share}
            className='inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'>
            <FaShareAlt aria-hidden='true' /> Compartir / Guardar
          </button>
        )}
      </div>

      <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
        Tocá <strong>Descargar Excel</strong> para guardar el archivo. Si Android no lo descarga,
        probá <strong>Compartir / Guardar</strong> (si aparece) o el CSV compatible con Excel.
        LTC no puede confirmar que el navegador haya terminado la descarga.
      </p>
    </section>
  );
}

export default function TransactionsExportReady({ prepared, onClose }) {
  if (!prepared) return null;

  return (
    <GenericModal
      component={PreparedExportOptions}
      prepared={prepared}
      show
      dialogLabel='Opciones de exportación'
      closeModal={onClose}
    />
  );
}
