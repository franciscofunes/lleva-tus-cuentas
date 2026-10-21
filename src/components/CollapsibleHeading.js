import React from 'react';
import { FaChevronDown } from 'react-icons/fa';

// Shared typography for every collapsible section in Portfolio,
// Transactions, and Portfolio Details. Keep styling in one place.
export const COLLAPSIBLE_HEADER_STYLES = Object.freeze({
  eyebrow: 'text-xs font-bold uppercase tracking-wider text-purple-500',
  title: 'text-xl font-extrabold text-slate-900 dark:text-white',
  description: 'mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400',
});

// One shell and spacing rhythm for Portfolio and Transactions widgets.
// The nested variant is reserved for collapsibles inside a main section.
export const COLLAPSIBLE_SURFACE_STYLES = Object.freeze({
  root: 'scroll-mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800',
  nested: 'min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60',
  header: 'flex w-full min-w-0 items-start justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 sm:p-5',
  content: 'min-w-0 border-t border-slate-200 px-4 pb-4 pt-4 dark:border-slate-700 sm:px-5 sm:pb-5 sm:pt-5',
});

// The same reveal control is used in Transactions movement cards and Banks account cards.
export const FINANCIAL_RECORD_DISCLOSURE_STYLES =
  'inline-flex min-h-[44px] min-w-0 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 dark:hover:bg-slate-900/70';

// Shared record-card surface for individual transactions and bank accounts.
// Keep hover, radius, and spacing consistent across modules.
export const FINANCIAL_ITEM_SURFACE_STYLES =
  'ltc-transaction-card w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm transition-colors hover:border-violet-300 sm:px-4 sm:py-4 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-500/60';

export function CollapsibleHeading({ eyebrow, title, description, level = 2 }) {
  const HeadingTag = level === 3 ? 'h3' : 'h2';
  const titleClass = level === 3
    ? 'text-base font-bold leading-snug text-slate-900 dark:text-slate-50 sm:text-lg'
    : COLLAPSIBLE_HEADER_STYLES.title;
  return (
    <div className='min-w-0'>
      {eyebrow && (
        <p className={COLLAPSIBLE_HEADER_STYLES.eyebrow}>{eyebrow}</p>
      )}
      <HeadingTag className={`${titleClass} ${eyebrow ? 'mt-1' : ''}`}>
        {title}
      </HeadingTag>
      {description && (
        <p className={COLLAPSIBLE_HEADER_STYLES.description}>{description}</p>
      )}
    </div>
  );
}

export function CollapsibleChevron({ expanded }) {
  return (
    <FaChevronDown
      aria-hidden='true'
      className={`mt-1 shrink-0 text-slate-600 transition-transform duration-200 motion-reduce:transition-none dark:text-slate-300 ${expanded ? 'rotate-180' : ''}`}
    />
  );
}
