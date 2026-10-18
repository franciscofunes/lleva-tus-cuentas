import React from 'react';
const chartMoney = (number, currency) => Number.isFinite(number)
  ? new Intl.NumberFormat('es-AR',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(number)
  : 'N/D';

/** Consistent visual shell for historical, newer and geographic charts. */
export default function TransactionChartSurface({ title, description, actions, footer, children, className = '' }) {
  return <section className={'ltc-chart-surface w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 sm:p-5 ' + className}>
    <header className='flex min-w-0 flex-wrap items-start justify-between gap-3'>
      <div className='min-w-0 flex-1'>
        <h3 className='text-base font-extrabold leading-snug sm:text-lg'>{title}</h3>
        {description && <p className='mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>{description}</p>}
      </div>
      {actions && <div className='shrink-0'>{actions}</div>}
    </header>
    <div className='mt-5 min-w-0 max-w-full'>{children}</div>
    {footer && <p className='mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>{footer}</p>}
  </section>;
}

export function ChartMoney({ value, currency }) {
  return <span className='font-bold tabular-nums'>{chartMoney(Number(value), currency)}</span>;
}
export function TransactionChartEmpty({ children }) {
  return <div role='status' className='rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300'>{children}</div>;
}
export function ChartCurrencySwitch({ currency, onChange, label = 'Moneda del gráfico' }) {
  return <div role='group' aria-label={label} className='inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/70'>
    {['ARS','USD'].map(item=><button key={item} type='button' aria-pressed={currency===item} onClick={()=>onChange(item)}
      className={'min-h-[36px] min-w-[46px] rounded-lg px-2 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 '+
        (currency===item?'bg-purple-600 text-white shadow-sm':'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700')}>{item}</button>)}
  </div>;
}
