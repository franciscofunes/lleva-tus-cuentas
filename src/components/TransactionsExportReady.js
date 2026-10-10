import React from 'react';
import { FaDownload, FaFileCsv, FaFileExcel, FaShareAlt, FaTimes } from 'react-icons/fa';

/**
 * User-activated native download links. Never claim that a browser completed
 * a download: browsers do not expose its outcome to this application.
 */
export default function TransactionsExportReady({ prepared, onClose }) {
  if (!prepared) return null;
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
      // The user can back out of the Android share dialog without an error.
      if (error?.name !== 'AbortError') {
        console.warn('[ltc-export] No se pudo compartir el archivo', error);
      }
    }
  };

  return (
    <section role="region" aria-label="Archivo de transacciones preparado"
      className="mt-3 rounded-2xl border border-purple-400/50 bg-white p-4 shadow-sm dark:border-purple-400/40 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Archivo preparado para descargar
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {count} movimientos según los filtros seleccionados. El archivo se prepara en tu dispositivo, sin subir tus datos.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar opciones de descarga"
          className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-slate-300 dark:hover:bg-slate-700">
          <FaTimes aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 break-all text-[11px] text-slate-500 dark:text-slate-400">{filename}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a href={xlsxUrl} download={filename}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2">
          <FaFileExcel aria-hidden="true" /> <FaDownload aria-hidden="true" /> Descargar Excel
        </a>
        <a href={csvUrl} download={csvFilename}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
          <FaFileCsv aria-hidden="true" /> Descargar CSV
        </a>
        {canShare && (
          <button type="button" onClick={share}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
            <FaShareAlt aria-hidden="true" /> Compartir / Guardar
          </button>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        Tocá <strong>Descargar Excel</strong> para guardar el archivo. Si Android no lo descarga,
        probá <strong>Compartir / Guardar</strong> (si aparece) o el CSV compatible con Excel.
        LTC no puede confirmar que el navegador haya terminado la descarga.
      </p>
    </section>
  );
}
