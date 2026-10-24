import React, { useId, useState } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import CardStatementDetails from './CardStatementDetails';
import {
  COLLAPSIBLE_HEADER_STYLES,
  FINANCIAL_ITEM_SURFACE_STYLES,
  FINANCIAL_RECORD_DISCLOSURE_STYLES,
} from './CollapsibleHeading';

const money = (amount, currency) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(amount || 0));
const secondary = 'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700';

/**
 * Read-only linked statement summary. The only action edits the
 * owner-scoped link through the existing StatementLinkEditor modal.
 * Purchases, ARS/USD totals and original PDF are NEVER mutated here.
 */
export default function LinkedStatementCard({ statement, privacyHidden = false, disabled = false, onCorrect }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <article className={FINANCIAL_ITEM_SURFACE_STYLES}
      aria-label={'Resumen vinculado ' + statement.period + ' ' + statement.cardBrand}>
      <div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <p className={COLLAPSIBLE_HEADER_STYLES.eyebrow}>Resumen vinculado</p>
          <h4 className='mt-1 break-words text-base font-extrabold text-slate-900 dark:text-slate-50'>
            Resumen {statement.period} · {statement.cardBrand}
          </h4>
          <p className='mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
            Cierre {statement.closingDate || 'sin fecha'} · Vencimiento {statement.dueDate || 'sin fecha'} · {statement.itemCount ?? 0} consumos
          </p>
          <p className='mt-2 break-words text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50'
            aria-label='Totales del resumen vinculado por moneda'>
            {privacyHidden ? 'ARS •••• · USD ••••'
              : 'ARS ' + money(statement.totals?.ARS, 'ARS') + ' · USD ' + money(statement.totals?.USD, 'USD')}
          </p>
        </div>
        <button type='button' aria-controls={detailsId} aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
          className={FINANCIAL_RECORD_DISCLOSURE_STYLES + ' shrink-0 self-start border border-slate-300 px-3 dark:border-slate-600'}>
          {expanded ? 'Ocultar opciones' : 'Revisar resumen'}
        </button>
      </div>
      {expanded && <div id={detailsId} className='mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700'>
        <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
          Los consumos importados sirven para consultar el PDF; no se suman otra vez a Transacciones.
        </p>
        {privacyHidden
          ? <p className='text-xs text-slate-600 dark:text-slate-300'>
              Mostrá los importes en Bancos para consultar el desglose.
            </p>
          : <CardStatementDetails key={statement.expenseId} expenseId={statement.expenseId} />}
        <button type='button' className={secondary} disabled={disabled}
          aria-label={'Corregir vínculo del resumen ' + statement.period}
          onClick={() => onCorrect?.(statement.expenseId)}>
          <FiEdit2 aria-hidden='true' /> Corregir vínculo
        </button>
      </div>}
    </article>
  );
}
