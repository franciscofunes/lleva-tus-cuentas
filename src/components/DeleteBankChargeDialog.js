import React, { useRef, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import GenericModal from './GenericModal';

// The bank page owns persistence. The first tap only opens this confirmation.
export default function DeleteBankChargeDialog({ charge, privacyHidden = true, onClose, onDelete }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef(false);
  if (!charge) return null;

  const closeSafely = () => {
    if (!pendingRef.current) onClose();
  };

  const confirmDelete = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError('');

    try {
      await onDelete(charge.id);
      onClose();
    } catch {
      setError('No se pudo eliminar el consumo. Revisá la conexión y volvé a intentarlo.');
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const amount = privacyHidden
    ? '••••'
    : new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: charge.currency === 'USD' ? 'USD' : 'ARS',
      maximumFractionDigits: 2,
    }).format(Number(charge.amount || 0));

  return (
    <GenericModal
      show
      closeModal={closeSafely}
      dialogLabel='Eliminar consumo manual'
      component={
        <div className='min-w-0 space-y-5 pb-1' aria-busy={pending}>
          <div className='flex min-w-0 items-start gap-3'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' aria-hidden='true'>
              <FiAlertTriangle size={22} />
            </span>
            <div className='min-w-0'>
              <h2 className='break-words pr-6 text-xl font-bold text-slate-900 dark:text-slate-50'>¿Eliminar este consumo?</h2>
              <p className='mt-2 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200'>
                Vas a eliminar el consumo manual <strong>«{charge.merchant || 'Sin comercio'}»</strong>.
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className='min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'>
            <p className='break-words font-semibold'>Fecha: {charge.purchaseDate || 'Sin fecha'}</p>
            <p className='mt-1 break-all font-bold tabular-nums' aria-label='Importe del consumo'>{amount}</p>
            <p className='mt-2 text-xs leading-relaxed'>
              Solo se eliminará este consumo manual. No se borrará ningún resumen PDF ni ningún gasto de Transacciones.
            </p>
          </div>
          {error && <p role='alert' className='rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'>{error}</p>}
          <div className='flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end'>
            <button type='button' disabled={pending} onClick={closeSafely}
              className='min-h-[44px] rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-60'>
              Cancelar
            </button>
            <button type='button' disabled={pending} onClick={confirmDelete}
              className='min-h-[44px] rounded-xl border border-rose-500 px-5 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60 dark:border-rose-500/70 dark:text-rose-300 dark:hover:bg-rose-950/30'>
              {pending ? 'Eliminando…' : 'Eliminar consumo'}
            </button>
          </div>
        </div>
      }
    />
  );
}
