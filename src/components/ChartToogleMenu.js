import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export const chartChoices = [
  { key: 'expenses', label: 'Gastos ARS' },
  { key: 'income', label: 'Ingresos ARS' },
  { key: 'divisas', label: 'Ingresos USD' },
  { key: 'incomesVsExpenses', label: 'Comparativa ARS' },
  { key: 'ingresoDivisas', label: 'Evolución USD' },
];

/**
 * Compact chart navigation: accessible bullets and previous/next controls.
 * The available charts never form a horizontally overflowing strip.
 * All navigation uses the same onSelect callback as before.
 */
export default function ChartToggleMenu({ selectedChart, handleChartToggle, chartComponents }) {
  const choices = chartChoices.filter(({ key }) => Boolean(chartComponents[key]));
  const index = Math.max(0, choices.findIndex(({ key }) => key === selectedChart));
  if (!choices.length) return null;

  const navigate = (step) => {
    const nextIndex = (index + step + choices.length) % choices.length;
    handleChartToggle(choices[nextIndex].key);
  };

  return (
    <div role='group' aria-label='Seleccionar gráfico'
      className='flex w-full min-w-0 max-w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1 py-1 dark:border-slate-700 dark:bg-slate-900/70 sm:gap-2'>
      <button type='button' aria-label='Gráfico anterior' title='Gráfico anterior'
        onClick={() => navigate(-1)} disabled={choices.length < 2}
        className='flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700'>
        <FiChevronLeft aria-hidden='true' size={21} />
      </button>

      <div className='flex min-w-0 flex-1 items-center justify-center gap-0 sm:gap-1'>
        {choices.map(({ key, label }, dotIndex) => {
          const active = selectedChart === key;
          return (
            <button key={key} type='button' aria-label={'Ir a ' + label}
              title={label} aria-pressed={active}
              onClick={() => handleChartToggle(key)}
              className='flex h-11 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:max-w-12'>
              <span aria-hidden='true'
                className={'block rounded-full transition-all duration-150 ' +
                  (active
                    ? 'h-3 w-6 bg-purple-600 dark:bg-purple-400'
                    : 'h-2.5 w-2.5 bg-slate-400 dark:bg-slate-500')}
              />
              <span className='sr-only'>{dotIndex + 1} de {choices.length}</span>
            </button>
          );
        })}
      </div>

      <button type='button' aria-label='Gráfico siguiente' title='Gráfico siguiente'
        onClick={() => navigate(1)} disabled={choices.length < 2}
        className='flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700'>
        <FiChevronRight aria-hidden='true' size={21} />
      </button>
    </div>
  );
}
