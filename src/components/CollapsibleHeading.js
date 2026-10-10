import React from 'react';
import { FaChevronDown } from 'react-icons/fa';

// Shared typography for every collapsible section in Portfolio,
// Transactions, and Portfolio Details. Keep styling in one place.
export const COLLAPSIBLE_HEADER_STYLES = Object.freeze({
  eyebrow: 'text-xs font-bold uppercase tracking-wider text-purple-500',
  title: 'text-xl font-extrabold text-slate-900 dark:text-white',
  description: 'mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400',
});

export function CollapsibleHeading({ eyebrow, title, description }) {
  return (
    <div className='min-w-0'>
      {eyebrow && (
        <p className={COLLAPSIBLE_HEADER_STYLES.eyebrow}>{eyebrow}</p>
      )}
      <h2 className={`${COLLAPSIBLE_HEADER_STYLES.title} ${eyebrow ? 'mt-1' : ''}`}>
        {title}
      </h2>
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
