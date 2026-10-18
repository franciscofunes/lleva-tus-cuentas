import React, { useState } from 'react';
import TransactionChartSurface, { TransactionChartEmpty } from './TransactionChartSurface';
import { FiChevronDown } from 'react-icons/fi';

const toneStyles = {
  expense: { fill: 'bg-rose-500 dark:bg-rose-400', track: 'bg-rose-100 dark:bg-rose-500/15' },
  income: { fill: 'bg-emerald-500 dark:bg-emerald-400', track: 'bg-emerald-100 dark:bg-emerald-500/15' },
  usd: { fill: 'bg-purple-500 dark:bg-purple-400', track: 'bg-purple-100 dark:bg-purple-500/15' },
};

export const chartMoney = (number, currency = 'ARS') =>
  Number.isFinite(number)
    ? new Intl.NumberFormat('es-AR', {
      style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(number)
    : 'N/D';

/**
 * Presentation-only replacement for Tremor BarList.
 * Receives the SAME grouped values; percentages are only proportional bar widths.
 * Displays up to five categories initially to reduce mobile scroll height.
 */
export default function CategoryBreakdownChart({ data = [], title, currency = 'ARS', tone = 'expense' }) {
  const [expanded, setExpanded] = useState(false);
  const styles = toneStyles[tone] || toneStyles.expense;
  const rows = expanded ? data : data.slice(0, 5);
  const maxValue = Math.max(0, ...data.map((row) => Number(row.value) || 0));
  return (
    <TransactionChartSurface title={title} description={'Distribución por categoría · '+currency+' · Período seleccionado'}>
      {data.length === 0 ? (
        <TransactionChartEmpty>No hay movimientos registrados para este gráfico en el período.</TransactionChartEmpty>
      ) : (
        <>
          <ol className='mt-5 min-w-0 space-y-4'>
            {rows.map((row, i) => {
              const safeValue = Number(row.value) || 0;
              const width = maxValue > 0 ? Math.min(100, Math.max(0, safeValue / maxValue * 100)) : 0;
              return (
                <li key={row.name || i} className='min-w-0'>
                  <div className='flex w-full min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3'>
                    <span className='block min-w-0 max-w-full break-words font-semibold text-slate-800 dark:text-slate-100'>{row.name}</span>
                    <span className='block w-full min-w-0 max-w-full break-words font-bold tabular-nums text-slate-900 dark:text-white sm:w-auto sm:text-right'>{chartMoney(safeValue, currency)}</span>
                  </div>
                  <div className={'mt-2 h-2.5 overflow-hidden rounded-full ' + styles.track} aria-hidden='true'>
                    <div className={'h-full rounded-full ' + styles.fill} style={{ width: width + '%' }} />
                  </div>
                </li>
              );
            })}
          </ol>
          {data.length > 5 && (
            <button type='button' onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className='mt-5 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-bold text-purple-700 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-purple-300 dark:hover:bg-slate-700'>
              {expanded ? 'Mostrar menos' : 'Ver todas las categorías (' + data.length + ')'}
              <FiChevronDown aria-hidden='true' className={expanded ? 'rotate-180' : ''} />
            </button>
          )}
        </>
      )}
    </TransactionChartSurface>
  );
}
