import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaArrowDown, FaFileExcel, FaRegCopy } from 'react-icons/fa';
import { CollapsibleChevron, CollapsibleHeading } from './CollapsibleHeading';

const actionIcons = { excel: FaFileExcel, markdown: FaRegCopy };
const KPI_VALUE_TRANSITION_MS = 180;

const itemMotion = (reduceMotion, index) => reduceMotion
  ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
  : {
      initial: { opacity: 0, y: 5 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.19, delay: Math.min(index, 4) * 0.035, ease: 'easeOut' },
    };

// A real fetch shows skeletons for the whole request. Firestore live updates,
// search, and period results can also change KPIs after the initial load:
// display a brief placeholder instead of flashing an out-of-date figure.
export function FinancialKpiValue({ value, label, loading = false, privacyHidden = false, reduceMotion = false }) {
  const [displayedValue, setDisplayedValue] = useState(value);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (loading || privacyHidden || reduceMotion) {
      setDisplayedValue(value);
      setChanging(false);
      return undefined;
    }

    if (Object.is(value, displayedValue)) return undefined;
    setChanging(true);
    const timer = setTimeout(() => {
      setDisplayedValue(value);
      setChanging(false);
    }, KPI_VALUE_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [value, displayedValue, loading, privacyHidden, reduceMotion]);

  const valueHasChanged = !loading && !privacyHidden && !reduceMotion && !Object.is(value, displayedValue);
  if (loading || changing || valueHasChanged) {
    return (
      <span role='status' aria-label={`Actualizando ${label}`}
        className='flex h-8 items-center sm:h-9'>
        <span aria-hidden='true'
          className={`block h-6 w-14 max-w-full rounded-md bg-slate-200 dark:bg-slate-700/90 ${reduceMotion ? '' : 'animate-pulse motion-reduce:animate-none'}`}
        />
      </span>
    );
  }

  return (
    <span title={String(displayedValue)}>
      {displayedValue}
    </span>
  );
}

export default function FinancialOverviewPanel({
  title, eyebrow = 'Herramientas y métricas', description,
  metrics = [], actions = [], privacyHidden = false, isLoading = false,
  id, collapsed = false, onToggle,
}) {
  const reduceMotion = useReducedMotion();
  const contentId = id ? `${id}-content` : undefined;

  return (
    <section
      id={id}
      aria-label={title}
      aria-busy={isLoading}
      className='mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800'
    >
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={contentId}
        aria-label={`${title}: ${collapsed ? 'expandir' : 'contraer'}`}
        className='flex w-full items-start justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500'
      >
        <CollapsibleHeading eyebrow={eyebrow} title={title} description={description} />
        <CollapsibleChevron expanded={!collapsed} />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            id={contentId}
            key='overview-content'
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            className='overflow-hidden'
          >
            <div className='border-t border-slate-200 px-4 pb-4 pt-4 sm:px-5 dark:border-slate-700/80'>
              <div className='grid grid-cols-2 gap-2 sm:max-w-md'>
                {actions.map((action, index) => {
                  const Icon = actionIcons[action.type] || FaArrowDown;
                  return (
                    <motion.button
                      key={action.id}
                      type='button'
                      onClick={action.onClick}
                      disabled={Boolean(action.disabled || isLoading)}
                      title={action.title || action.label}
                      aria-label={action.label}
                      {...itemMotion(reduceMotion, index)}
                      whileTap={reduceMotion ? undefined : { scale: 0.975 }}
                      whileHover={reduceMotion ? undefined : { y: -1 }}
                      className='group flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:border-violet-400 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900/40 dark:text-white dark:hover:border-violet-400/70'
                    >
                      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300'>
                        <Icon size={15} aria-hidden='true' />
                      </span>
                      <span className='min-w-0 truncate'>{action.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              <p className='mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400'>
                {privacyHidden
                  ? 'Los archivos y el Markdown incluyen los importes reales, aunque estén ocultos en pantalla.'
                  : 'Excel para descargar · Markdown para copiar y analizar con Lita.'}
              </p>
            </div>

            <div className='grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4'>
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={metric.id}
                    {...itemMotion(reduceMotion, index + actions.length)}
                    className='min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-4 sm:py-4 dark:border-slate-700/90 dark:bg-slate-900/50'
                  >
                    <span className='mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300'>
                      {Icon && <Icon size={15} aria-hidden='true' />}
                    </span>
                    <p className='truncate text-xl font-extrabold tabular-nums tracking-tight text-slate-950 sm:text-2xl dark:text-white'>
                      <FinancialKpiValue
                        value={metric.value}
                        label={metric.label}
                        loading={isLoading || Boolean(metric.loading)}
                        privacyHidden={privacyHidden}
                        reduceMotion={Boolean(reduceMotion)}
                      />
                    </p>
                    <p className='mt-1 text-[11px] leading-tight text-slate-600 sm:text-xs dark:text-slate-400'>{metric.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
