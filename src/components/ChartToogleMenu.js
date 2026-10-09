import React from 'react';

export const chartChoices = [
  { key: 'expenses', label: 'Gastos ARS' },
  { key: 'income', label: 'Ingresos ARS' },
  { key: 'divisas', label: 'Ingresos USD' },
  { key: 'incomesVsExpenses', label: 'Comparativa ARS' },
  { key: 'ingresoDivisas', label: 'Evolución USD' },
];

/**
 * Accessible replacement for the five unlabeled pagination dots.
 * Choices stay independent of chart values and available date ranges.
 */
export default function ChartToggleMenu({ selectedChart, handleChartToggle, chartComponents }) {
  return (
    <div role='group' aria-label='Seleccionar gráfico'
      className='-mx-1 flex max-w-full snap-x gap-2 overflow-x-auto px-1 py-2'>
      {chartChoices.filter(({ key }) => Boolean(chartComponents[key])).map(({ key, label }) => (
        <button key={key} type='button' onClick={() => handleChartToggle(key)}
          aria-pressed={selectedChart === key}
          className={'min-h-[42px] shrink-0 snap-start rounded-xl border px-3.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:text-sm ' +
            (selectedChart === key
              ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
              : 'border-slate-300 bg-white text-slate-700 hover:border-purple-400 hover:bg-purple-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700')}>
          {label}
        </button>
      ))}
    </div>
  );
}
