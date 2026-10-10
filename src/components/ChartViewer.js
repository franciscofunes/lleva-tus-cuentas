import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi';
import ChartToggleMenu, { chartChoices } from './ChartToogleMenu';
import '../styles/ltc-charts.css';

export default function ChartViewer({
  chartComponents, selectedChart, onSelect, chartData, categories, hideValues = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const close = useCallback(() => setExpanded(false), []);
  const chartLabel = chartChoices.find((item) => item.key === selectedChart)?.label || 'Gráfico';
  const activeComponent = chartComponents[selectedChart];

  useEffect(() => {
    if (!expanded) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [expanded, close]);

  const chart = () => {
    if (hideValues) {
      return (
        <p role='status' className='rounded-xl border border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'>
          Los gráficos están ocultos. Activá la visualización de importes para verlos.
        </p>
      );
    }
    if (!Array.isArray(categories)) {
      return <p role='status' className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'>Cargando categorías para los gráficos…</p>;
    }
    if (!activeComponent) return null;
    return React.createElement(activeComponent, {
      chartData: Array.isArray(chartData) ? chartData : [],
      categories,
    });
  };

  return (
    <div className='ltc-chart-viewport w-full min-w-0 max-w-full overflow-hidden'>
      <div className='mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <p className='text-xs font-semibold text-slate-600 dark:text-slate-300'>Elegí qué querés analizar</p>
          <p className='text-sm font-extrabold text-slate-900 dark:text-white'>{chartLabel}</p>
        </div>
        <button ref={triggerRef} type='button' onClick={() => setExpanded(true)}
          aria-label={'Ampliar gráfico: ' + chartLabel}
          className='inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-purple-700 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-purple-300 dark:hover:bg-slate-700'>
          <FiMaximize2 aria-hidden='true' size={16} /> Ampliar
        </button>
      </div>
      <div className='w-full min-w-0 max-w-full'>{chart()}</div>
      <div className='mt-3 w-full min-w-0 max-w-full'>
        <ChartToggleMenu selectedChart={selectedChart} handleChartToggle={onSelect} chartComponents={chartComponents} />
      </div>

      {expanded && createPortal(
        <div className='fixed inset-0 z-[9999] flex h-[100dvh] w-screen min-w-0 items-stretch justify-center overflow-hidden bg-slate-950/80 sm:items-center sm:p-5'
          data-testid='chart-modal-backdrop'
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section ref={dialogRef} role='dialog' aria-modal='true' aria-labelledby='chart-modal-title'
            className='flex h-[100dvh] min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-none border-0 bg-slate-50 text-slate-900 shadow-2xl dark:bg-gray-900 dark:text-white sm:h-auto sm:max-h-[90dvh] sm:max-w-5xl sm:rounded-3xl sm:border sm:border-slate-200 sm:dark:border-slate-700'>
            <div className='flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 pt-[max(12px,env(safe-area-inset-top))] dark:border-slate-700 sm:px-6 sm:pt-3'>
              <div>
                <p className='text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300'>Visualización ampliada</p>
                <h2 id='chart-modal-title' className='mt-1 text-lg font-extrabold'>{chartLabel}</h2>
              </div>
              <button ref={closeRef} type='button' onClick={close} aria-label='Cerrar gráfico ampliado'
                className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:text-slate-100'>
                <FiX size={20} aria-hidden='true' />
              </button>
            </div>
            <div className='min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-6'>
              <div className='w-full min-w-0 max-w-full'>{chart()}</div>
            </div>
            <div className='shrink-0 space-y-1 border-t border-slate-200 px-4 py-2 pb-[max(10px,env(safe-area-inset-bottom))] dark:border-slate-700 sm:px-6 sm:py-3'>
              <ChartToggleMenu selectedChart={selectedChart} handleChartToggle={onSelect} chartComponents={chartComponents} />
              <button type='button' onClick={close}
                className='inline-flex min-h-[36px] items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-300'>
                <FiMinimize2 aria-hidden='true' /> Volver al resumen
              </button>
            </div>
          </section>
        </div>, document.body
      )}
    </div>
  );
}
