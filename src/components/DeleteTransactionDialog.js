import React, { useRef, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import GenericModal from './GenericModal';

// One modal per requested transaction; Firestore is not mutated until confirmation.
function DeleteTransactionDialog({ transaction, onClose, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef(false);

  const closeSafely = () => {
    if (pendingRef.current) return;
    onClose();
  };

  const confirmDelete = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsDeleting(true);
    setError('');

    try {
      await onDelete(transaction.id);
      onClose();
    } catch (cause) {
      // The action also emits a toast; this inline message keeps the dialog actionable.
      setError('No se pudo eliminar el movimiento. Volvé a intentarlo.');
    } finally {
      pendingRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <GenericModal
      show={Boolean(transaction)}
      closeModal={closeSafely}
      dialogLabel='Eliminar movimiento'
      component={
        <div className='space-y-5 pb-1' aria-busy={isDeleting}>
          <div className='flex items-start gap-3'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' aria-hidden='true'>
              <FiAlertTriangle size={22} />
            </span>
            <div className='min-w-0'>
              <h2 className='break-words pr-6 text-xl font-bold text-slate-900 dark:text-slate-50'>¿Eliminar movimiento?</h2>
              <p className='mt-2 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200'>
                Vas a eliminar <strong>«{transaction.name || 'Sin nombre'}»</strong>. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          {error && <p role='alert' className='rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'>{error}</p>}

          <div className='flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end'>
            <button type='button' onClick={closeSafely} disabled={isDeleting}
              className='min-h-[44px] rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'>
              Cancelar
            </button>
            <button type='button' onClick={confirmDelete} disabled={isDeleting}
              className='min-h-[44px] rounded-xl border border-rose-500 px-5 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/70 dark:text-rose-300 dark:hover:bg-rose-950/30'>
              {isDeleting ? 'Eliminando…' : 'Eliminar movimiento'}
            </button>
          </div>
        </div>
      }
    />
  );
}

export default DeleteTransactionDialog;
