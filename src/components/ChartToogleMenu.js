import React from 'react';

export const chartChoices = [
  { key: 'expenses', label: 'Gastos ARS' },
  { key: 'income', label: 'Ingresos ARS' },
  { key: 'divisas', label: 'Ingresos USD' },
  { key: 'incomesVsExpenses', label: 'Comparativa ARS' },
  { key: 'ingresoDivisas', label: 'Evolución USD' },
];

/**
 * Mobile: one native select (no horizontal page overflow).
 * Desktop: labeled buttons that wrap within the section.
 */
export default function ChartToggleMenu({ selectedChart, handleChartToggle, chartComponents }) {
  const choices = chartChoices.filter(({ key }) => Boolean(chartComponents[key]));
  return (
    <div role='group' aria-label='Seleccionar gráfico' className='w-full min-w-0 max-w-full'>
      <select
        aria-label='Tipo de gráfico'
        value={selectedChart}
        onChange={(event) => handleChartToggle(event.target.value)}
        className='block h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:hidden'
      >
        {choices.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <div className='hidden min-w-0 max-w-full flex-wrap gap-2 sm:flex'>
        {choices.map(({ key, label }) => (
          <button key={key} type='button' onClick={() => handleChartToggle(key)}
            aria-pressed={selectedChart === key}
            className={'min-h-[42px] rounded-xl border px-3.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:text-sm ' +
              (selectedChart === key
                ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                : 'border-slate-300 bg-white text-slate-700 hover:border-purple-400 hover:bg-purple-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700')}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
