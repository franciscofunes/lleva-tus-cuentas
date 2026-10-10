import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaArrowDown, FaFileExcel, FaRegCopy } from 'react-icons/fa';
import { CollapsibleChevron, CollapsibleHeading } from './CollapsibleHeading';

const actionIcons = { excel: FaFileExcel, markdown: FaRegCopy };
const KPI_CHANGE_MS = 180;

const itemMotion = (reduceMotion, index) => reduceMotion
  ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
  : {
      initial: { opacity: 0, y: 5 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.19, delay: Math.min(index, 4) * 0.035, ease: 'easeOut' },
    };

// Values update as soon as the real data changes. The skeleton is presentation
// only: do not add a fake delay to Firestore, exports, charts or finance logic.
export function useKpiLoadingState(metrics, loading, reduceMotion) {
  const fingerprint = JSON.stringify(metrics.map(({ id, value }) => [id, value]));
  const [displayed, setDisplayed] = useState(() =>
    Object.fromEntries(metrics.map(({ id, value }) => [id, value]))
  );
  const [pending, setPending] = useState([]);
  const values = useMemo(
    () => Object.fromEntries(JSON.parse(fingerprint)),
    [fingerprint]
  );

  useEffect(() => {
    if (loading) {
      setPending([]);
      return undefined;
    }
    const changed = Object.keys(values).filter((id) =>
      !Object.prototype.hasOwnProperty.call(displayed, id) ||
      !Object.is(displayed[id], values[id])
    );
    if (!changed.length) return undefined;
    if (reduceMotion) {
      setDisplayed(values);
      setPending([]);
      return undefined;
    }
    // Only cards whose actual KPI value changed show the small loading state.
    setPending(changed);
    const timeout = setTimeout(() => {
      setDisplayed(values);
      setPending([]);
    }, KPI_CHANGE_MS);
    return () => clearTimeout(timeout);
    // Fingerprint tracks real metric values; changes in unrelated page state
    // (including hiding values) must not restart the skeleton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, loading, reduceMotion]);

  return { displayed, pending };
}

export default function FinancialOverviewPanel({
  title, eyebrow = 'Herramientas y métricas', description,
  metrics = [], actions = [], privacyHidden = false,
  id, collapsed = false, onToggle, loading = false,
}) {
  const reduceMotion = useReducedMotion();
  const { displayed, pending } = useKpiLoadingState(metrics, loading, reduceMotion);
  const contentId = id ? `${id}-content` : undefined;
  return (
    <section
      id={id}
      aria-label={title}
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
                      disabled={loading || action.disabled}
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
                const busy = loading || pending.includes(metric.id);
                return (
                  <motion.div
                    key={metric.id}
                    {...itemMotion(reduceMotion, index + actions.length)}
                    aria-busy={busy}
                    className='min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-4 sm:py-4 dark:border-slate-700/90 dark:bg-slate-900/50'
                  >
                    <span className='mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300'>
                      {Icon && <Icon size={15} aria-hidden='true' />}
                    </span>
                    {busy ? (
                      <div role='status' aria-label={`Actualizando ${metric.label}`} className='h-7 w-16 max-w-full animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none sm:h-8 dark:bg-slate-700'>
                        <span className='sr-only'>Cargando {metric.label}</span>
                      </div>
                    ) : (
                      <p className='truncate text-xl font-extrabold tabular-nums tracking-tight text-slate-950 sm:text-2xl dark:text-white' title={privacyHidden ? 'Valor oculto' : String(displayed[metric.id] ?? metric.value)}>
                        {privacyHidden ? '••' : displayed[metric.id] ?? metric.value}
                      </p>
                    )}
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
