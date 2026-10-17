import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCreditCard, FiLink2, FiTrash2 } from 'react-icons/fi';

const selectClass = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const outlineButton = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200';

/** Edits the owner-scoped *link*, not the imported PDF or its expense. */
export default function StatementLinkEditor({ statement, link, banks = [], cards = [], onSave, onUnlink, onClose }) {
  const [bankId, setBankId] = useState(link.bankId);
  const [cardId, setCardId] = useState(link.cardId);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBankId(link.bankId);
    setCardId(link.cardId);
    setConfirmUnlink(false);
    setError('');
  }, [link.expenseId, link.bankId, link.cardId]);

  const activeBanks = banks.filter((bank) => bank.active !== false);
  const bank = banks.find((item) => item.code === link.bankId);
  const currentCard = cards.find((item) => item.id === link.cardId);
  const selectedBank = activeBanks.find((item) => item.code === bankId);
  const selectedCard = cards.find((item) => item.id === cardId && item.bankId === bankId);
  const availableCards = cards.filter((item) => item.bankId === bankId);
  const unchanged = bankId === link.bankId && cardId === link.cardId;

  const perform = async (action, message) => {
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      await action();
      onClose(message);
    } catch (cause) {
      setError(cause?.message || 'No se pudo corregir la relación. Intentá nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const save = (event) => {
    event.preventDefault();
    if (!selectedBank || !selectedCard || unchanged) return;
    perform(() => onSave(statement.expenseId, bankId, cardId), 'Resumen vinculado a la nueva tarjeta.');
  };
  const unlink = () => perform(() => onUnlink(statement.expenseId), 'Resumen desvinculado. Podés volver a asociarlo desde los pendientes.');

  return <section className='space-y-4 pb-3' aria-label='Corregir vínculo del resumen'>
    <div className='pr-11'>
      <p className='text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300'>Corregir asociación</p>
      <h2 className='mt-1 text-lg font-extrabold'>Resumen {statement.period} · {statement.cardBrand}</h2>
      <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>Elegí el banco y la tarjeta correctos. La corrección no modifica el PDF, los consumos ni los importes de Transacciones.</p>
    </div>
    <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60'>
      <p className='text-xs font-bold uppercase text-slate-500 dark:text-slate-400'>Asociación actual</p>
      <p className='mt-1 font-semibold'>{bank?.name || 'Banco no disponible'} · {currentCard?.nickname || 'Tarjeta no disponible'}{currentCard?.lastFour ? ' · •••• ' + currentCard.lastFour : ''}</p>
    </div>

    <form onSubmit={save} className='space-y-3'>
      <label className='block text-sm font-semibold'>Nuevo banco
        <select aria-label='Nuevo banco del resumen' className={selectClass} value={bankId} disabled={saving}
          onChange={(event) => { setBankId(event.target.value); setCardId(''); setConfirmUnlink(false); }}>
          <option value=''>Seleccioná un banco</option>
          {activeBanks.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>
      <label className='block text-sm font-semibold'>Nueva tarjeta
        <select aria-label='Nueva tarjeta del resumen' className={selectClass} value={cardId} disabled={saving || !bankId}
          onChange={(event) => { setCardId(event.target.value); setConfirmUnlink(false); }}>
          <option value=''>Seleccioná una tarjeta</option>
          {availableCards.map((item) => <option key={item.id} value={item.id}>{item.nickname}{item.lastFour ? ' · •••• ' + item.lastFour : ''}</option>)}
        </select>
      </label>
      {selectedCard && !unchanged && <p className='flex items-start gap-2 rounded-xl bg-purple-50 p-3 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'>
        <FiCreditCard className='mt-0.5 shrink-0' aria-hidden='true' /> El resumen pasará a {selectedBank?.name} · {selectedCard.nickname}. Desaparecerá de la tarjeta anterior.
      </p>}
      {error && <p role='alert' className='rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200'>{error}</p>}
      <div className='flex flex-wrap gap-2'>
        <button type='submit' disabled={saving || unchanged || !selectedBank || !selectedCard}
          className='inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>
          <FiLink2 aria-hidden='true' /> {saving ? 'Guardando…' : 'Guardar nueva asociación'}
        </button>
        <button type='button' onClick={() => onClose()} disabled={saving} className={outlineButton}>Cancelar</button>
      </div>
    </form>

    <div className='space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700'>
      {!confirmUnlink ? <button type='button' disabled={saving} onClick={() => setConfirmUnlink(true)}
          className='inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/30'>
          <FiTrash2 aria-hidden='true' /> Desvincular resumen
        </button> :
        <div className='space-y-3 rounded-xl border border-rose-300 p-3 dark:border-rose-700'>
          <p className='flex items-start gap-2 text-sm font-bold text-rose-700 dark:text-rose-300'>
            <FiAlertTriangle className='mt-0.5 shrink-0' aria-hidden='true' /> ¿Querés quitar esta asociación?
          </p>
          <p className='text-sm'>El resumen volverá a «Vincular resúmenes a tarjetas». No se borra su PDF, la transacción ni ningún consumo.</p>
          <div className='flex flex-wrap gap-2'>
            <button type='button' disabled={saving} onClick={unlink}
              className='min-h-[44px] rounded-xl bg-rose-700 px-4 text-sm font-bold text-white disabled:opacity-50'>Sí, desvincular</button>
            <button type='button' disabled={saving} onClick={() => setConfirmUnlink(false)} className={outlineButton}>Mantener asociación</button>
          </div>
        </div>}
    </div>
  </section>;
}
