import React, { useRef, useState } from 'react';
import { FiRotateCcw } from 'react-icons/fi';
import GenericModal from './GenericModal';

// Reopening a month is explicit: never silently delete a recorded return.
export default function PortfolioReopenDialog({ reconciliation, onClose, onConfirm }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  if (!reconciliation) return null;

  const closeSafely = () => {
    if (!inFlight.current) onClose();
  };
  const confirmReopen = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      await onConfirm(reconciliation);
      onClose();
    } catch (cause) {
      setError(cause?.message || 'No se pudo reabrir el mes. Volvé a intentarlo.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  const label = new Date(`${reconciliation.month}-01T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const hasTransaction = Boolean(reconciliation.transactionId);

  return <GenericModal
    show
    closeModal={closeSafely}
    dialogLabel='Reabrir cierre mensual'
    component={<div className='min-w-0 space-y-5 pb-1' aria-busy={pending}>
      <div className='flex items-start gap-3'>
        <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200' aria-hidden='true'><FiRotateCcw size={22}/></span>
        <div className='min-w-0'>
          <h2 className='pr-6 text-xl font-bold text-slate-900 dark:text-slate-50'>¿Reabrir {label}?</h2>
          <p className='mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200'>
            {hasTransaction
              ? 'Se deshará el cierre y se eliminará únicamente el ingreso que este cierre generó en Transacciones.'
              : 'Se eliminará el cierre pendiente para poder volver a calcularlo cuando corresponda.'}
          </p>
        </div>
      </div>
      <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'>
        <p className='font-semibold'>Las verificaciones originales, los rendimientos observados y el saldo de la posición se conservan.</p>
        <p className='mt-2'>Los demás meses y sus transacciones no se modifican.</p>
      </div>
      {error && <p role='alert' className='rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'>{error}</p>}
      <div className='flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end'>
        <button type='button' disabled={pending} onClick={closeSafely} className='min-h-[44px] rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'>Cancelar</button>
        <button type='button' disabled={pending} onClick={confirmReopen} className='min-h-[44px] rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50'>{pending ? 'Reabriendo…' : hasTransaction ? 'Reabrir y deshacer registro' : 'Reabrir cierre'}</button>
      </div>
    </div>}
  />;
}
