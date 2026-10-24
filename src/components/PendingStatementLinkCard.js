import React, { useId, useRef, useState } from 'react';
import { FiCreditCard, FiLink2 } from 'react-icons/fi';
import GenericModal from './GenericModal';
import CardStatementDetails from './CardStatementDetails';
import {
  COLLAPSIBLE_HEADER_STYLES,
  FINANCIAL_ITEM_SURFACE_STYLES,
  FINANCIAL_RECORD_DISCLOSURE_STYLES,
} from './CollapsibleHeading';
import { suggestCardForImportedStatement } from '../utils/bankLinkSuggestions';

const primary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50';
const secondary = 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700';
const selectClass = 'min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const money = (value, currency) => new Intl.NumberFormat('es-AR', {
  style:'currency', currency, maximumFractionDigits:2,
}).format(Number(value || 0));

/**
 * Review an already imported statement's association. This component never
 * creates expenses or imports PDFs; only the owner-scoped link is persisted
 * by the supplied onLink callback, after explicit confirmation.
 */
export default function PendingStatementLinkCard({
  statement, banks = [], cards = [], privacyHidden = false, disabled = false,
  onLink, onLinked,
}) {
  const detailId = useId();
  const pendingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [bankId, setBankId] = useState('');
  const [cardId, setCardId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeBanks = banks.filter(bank => bank.active !== false);
  const selectedBank = activeBanks.find(bank => bank.code === bankId);
  const availableCards = cards.filter(card => card.bankId === bankId);
  const selectedCard = availableCards.find(card => card.id === cardId);
  const suggestion = suggestCardForImportedStatement(statement, activeBanks, cards);
  const cardDescription = selectedBank && selectedCard
    ? selectedBank.name + ' · ' + selectedCard.nickname +
      (selectedCard.lastFour ? ' · •••• ' + selectedCard.lastFour : '') : '';

  const cancelReview = () => {
    if (pendingRef.current) return;
    setConfirming(false);
  };
  const confirmLink = async () => {
    // Ref guards repeated clicks before React has rendered disabled=true.
    if (pendingRef.current || disabled || !selectedBank || !selectedCard ||
      typeof onLink !== 'function') return;
    pendingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onLink(statement.expenseId, selectedBank.code, selectedCard.id);
      setConfirming(false);
      setExpanded(false);
      onLinked?.();
    } catch (cause) {
      // Backend errors can contain private infrastructure details; never
      // expose raw Firestore exceptions inside a financial UI.
      setError(cause?.code === 'permission-denied'
        ? 'No tenés permiso para vincular el resumen. Verificá tu sesión.'
        : 'No se pudo vincular el resumen. Verificá la conexión e intentá nuevamente.');
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <article className={FINANCIAL_ITEM_SURFACE_STYLES} aria-label={'Resumen pendiente ' + statement.period}>
      <div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <p className={COLLAPSIBLE_HEADER_STYLES.eyebrow}>Pendiente de vincular</p>
          <h3 className='mt-1 break-words text-base font-extrabold text-slate-900 dark:text-slate-50'>
            {statement.institution || 'Institución no informada'} · {statement.cardBrand || 'Tarjeta'}
          </h3>
          <p className='mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
            Período {statement.period} · Cierre {statement.closingDate || 'sin fecha'} · Vence {statement.dueDate || 'sin fecha'}
          </p>
          <p className='mt-2 break-words text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50'
            aria-label='Totales de resumen por moneda'>
            {privacyHidden ? 'ARS •••• · USD ••••'
              : money(statement.totals?.ARS, 'ARS') + ' · ' + money(statement.totals?.USD, 'USD')}
          </p>
        </div>
        <button type='button' aria-expanded={expanded} aria-controls={detailId}
          onClick={() => { if (!pendingRef.current) setExpanded(current => !current); }}
          className={FINANCIAL_RECORD_DISCLOSURE_STYLES + ' shrink-0 self-start border border-slate-300 px-3 dark:border-slate-600'}>
          {expanded ? 'Ocultar opciones' : 'Revisar vínculo'}
        </button>
      </div>
      {expanded && <div id={detailId} className='mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700'>
        <p className='text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
          El PDF y la transacción ya están guardados. Solo elegís a qué tarjeta asociarlos:
          no se crea otro gasto ni se vuelven a registrar consumos.
        </p>
        {privacyHidden
          ? <p className='text-xs text-slate-600 dark:text-slate-300'>Mostrá los importes en Bancos para consultar los consumos del PDF.</p>
          : <CardStatementDetails expenseId={statement.expenseId} />}
        {suggestion && (
          <div className='flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-900 dark:bg-slate-900/70'>
            <p className='min-w-0 flex-1 text-slate-700 dark:text-slate-200'>
              Coincidencia probable: <strong>{activeBanks.find(bank => bank.code === suggestion.bankId)?.name} · {cards.find(card => card.id === suggestion.cardId)?.nickname}</strong>
            </p>
            <button type='button' className={secondary} disabled={disabled || saving}
              onClick={() => { setBankId(suggestion.bankId); setCardId(suggestion.cardId); setError(''); }}>
              Usar sugerencia
            </button>
          </div>
        )}
        <div className='grid min-w-0 gap-3 sm:grid-cols-2'>
          <label className='block min-w-0 space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300'>
            <span>Banco</span>
            <select className={selectClass} aria-label={'Banco para ' + statement.period}
              value={bankId} disabled={disabled || saving}
              onChange={event => { setBankId(event.target.value); setCardId(''); setError(''); }}>
              <option value=''>Elegí banco</option>
              {activeBanks.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
            </select>
          </label>
          <label className='block min-w-0 space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300'>
            <span>Tarjeta</span>
            <select className={selectClass} aria-label={'Tarjeta para ' + statement.period}
              value={cardId} disabled={disabled || saving || !bankId}
              onChange={event => { setCardId(event.target.value); setError(''); }}>
              <option value=''>Elegí tarjeta</option>
              {availableCards.map(card => <option key={card.id} value={card.id}>
                {card.nickname}{card.lastFour ? ' · •••• ' + card.lastFour : ''}
              </option>)}
            </select>
          </label>
        </div>
        {cardDescription && <p role='status' className='text-sm text-slate-700 dark:text-slate-200'>
          Tarjeta elegida: <strong>{cardDescription}</strong>
        </p>}
        {error && !confirming && <p role='alert' className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'>{error}</p>}
        <button type='button' className={primary} disabled={disabled || saving || !selectedBank || !selectedCard}
          onClick={() => { setError(''); setConfirming(true); }}>
          <FiLink2 aria-hidden='true' /> Revisar asociación
        </button>
      </div>}
      <GenericModal show={confirming} dialogLabel={'Confirmar vínculo del resumen ' + statement.period}
        closeModal={cancelReview}
        component={<section className='space-y-4 pb-3'>
          <p className={COLLAPSIBLE_HEADER_STYLES.eyebrow}>Confirmación</p>
          <h2 className='text-xl font-extrabold text-slate-900 dark:text-white'>Vincular resumen a tarjeta</h2>
          <p className='text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
            Resumen <strong>{statement.period} · {statement.cardBrand}</strong>
          </p>
          <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800'>
            <p className='text-xs font-bold text-slate-600 dark:text-slate-300'>Destino</p>
            <p className='mt-1 break-words text-base font-bold'>{cardDescription}</p>
          </div>
          <p className='text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
            Se guarda solamente la asociación. No se duplica la transacción, el PDF ni los consumos.
          </p>
          {error && <p role='alert' className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'>{error}</p>}
          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className={secondary} disabled={saving} onClick={cancelReview}>Cancelar</button>
            <button type='button' className={primary} disabled={saving || disabled || !selectedBank || !selectedCard}
              onClick={confirmLink}>
              <FiCreditCard aria-hidden='true' />
              {saving ? 'Vinculando…' : 'Confirmar vínculo'}
            </button>
          </div>
        </section>}
      />
    </article>
  );
}
