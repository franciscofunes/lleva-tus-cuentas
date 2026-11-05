import React from 'react';
import { FiImage, FiUploadCloud } from 'react-icons/fi';
import { COLLAPSIBLE_SURFACE_STYLES } from './CollapsibleHeading';

/** A shared, discoverable entry point for the existing local screenshot readers. */
export default function ScreenshotImportShortcut({ title, description, actionLabel, onAction, disabled = false, hint, children }) {
  return (
    <section aria-label={title} className={`${COLLAPSIBLE_SURFACE_STYLES.nested} p-3 sm:p-4`}>
      <div className='flex min-w-0 items-start gap-3'>
        <span aria-hidden='true' className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-slate-800 dark:text-violet-200'>
          <FiImage className='h-5 w-5'/>
        </span>
        <div className='min-w-0'>
          <h3 className='text-base font-bold leading-snug text-slate-900 dark:text-slate-50'>{title}</h3>
          <p className='mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200'>{description}</p>
        </div>
      </div>
      <div className='mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end'>
        {children && <div className='min-w-0 flex-1'>{children}</div>}
        <button type='button' onClick={onAction} disabled={disabled}
          className='inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-violet-400 bg-white px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-600 dark:bg-slate-800 dark:text-violet-200 dark:hover:bg-slate-700 sm:shrink-0'>
          <FiUploadCloud aria-hidden='true' className='shrink-0'/> {actionLabel}
        </button>
      </div>
      {hint && <p className='mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300'>{hint}</p>}
    </section>
  );
}
