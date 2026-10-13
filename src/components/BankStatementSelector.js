import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStatementLink, subscribeBanks, subscribeBankCards } from '../services/bankingService';

const selectClass = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

/**
 * Controlled financial relationship picker. The linkage is stored separately
 * under bankStatementLinks/<expenseId>, not in expenses, so old schemas and
 * calculations remain exactly as they were.
 */
export default function BankStatementSelector({
  uid, expenseId, bankId, cardId, onBankChange, onCardChange, disabled = false,
}) {
  const [banks, setBanks] = useState([]);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!uid) return undefined;
    let active = true;
    const fail = () => active && setError('No se pudieron cargar los bancos.');
    const stops = [
      subscribeBanks(uid, (rows) => { if (active) setBanks(rows); }, fail),
      subscribeBankCards(uid, (rows) => { if (active) setCards(rows); }, fail),
    ];
    return () => { active = false; stops.forEach((stop) => stop?.()); };
  }, [uid]);
  useEffect(() => {
    if (!uid || !expenseId) return undefined;
    let active = true;
    getStatementLink(uid, expenseId).then((value) => {
      if (active && value) { onBankChange(value.bankId); onCardChange(value.cardId); }
    }).catch(() => { if (active) setError('No se pudo recuperar la asociación del resumen.'); });
    return () => { active = false; };
  }, [uid, expenseId, onBankChange, onCardChange]);
  const available = cards.filter((card) => card.bankId === bankId);
  return (
    <fieldset className='mt-3 space-y-2 rounded-xl border border-purple-300 bg-purple-50/60 p-3 dark:border-purple-500/40 dark:bg-slate-900/60'>
      <legend className='px-1 text-sm font-bold text-purple-700 dark:text-purple-200'>Banco y tarjeta (opcional)</legend>
      <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
        Asocia este resumen con Bancos sin registrar de nuevo sus consumos. Podés dejarlo sin vincular y hacerlo después.
      </p>
      <label className='block text-xs font-semibold'>Banco
        <select className={selectClass} aria-label='Banco del resumen' value={bankId} disabled={disabled}
          onChange={(event) => { onBankChange(event.target.value); onCardChange(''); }}>
          <option value=''>Sin asignar</option>
          {banks.filter((bank) => bank.active).map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
        </select>
      </label>
      <label className='block text-xs font-semibold'>Tarjeta
        <select className={selectClass} aria-label='Tarjeta del resumen' value={cardId}
          disabled={disabled || !bankId} onChange={(event) => onCardChange(event.target.value)}>
          <option value=''>Sin asignar</option>
          {available.map((card) => <option key={card.id} value={card.id}>{card.nickname}{card.lastFour ? ' •••• '+card.lastFour : ''}</option>)}
        </select>
      </label>
      {error && <p role='status' className='text-xs text-rose-600 dark:text-rose-300'>{error}</p>}
      {banks.length === 0 && <Link className='inline-flex min-h-[40px] items-center text-xs font-bold text-purple-700 dark:text-purple-300' to='/bancos'>Configurar bancos y tarjetas →</Link>}
    </fieldset>
  );
}
