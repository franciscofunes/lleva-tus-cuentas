// Published fund returns are optional inputs. A missing month is not a 0% month.
export const MONTHS_IN_ORDER = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const parsePublishedReturn = (raw) => {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return null;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const monthlyPublishedReturnEntries = (returns = {}) => MONTHS_IN_ORDER
  .map((month) => ({ month, value: parsePublishedReturn(returns?.[month]) }))
  .filter(({ value }) => value !== null);

export const publishedReturnTone = (value) => value == null || value === 0
  ? 'text-slate-900 dark:text-slate-50'
  : value > 0
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-rose-700 dark:text-rose-400';

export const formattedPublishedReturn = (value, precision = 2) => value == null
  ? '—'
  : `${value > 0 ? '+' : ''}${value.toFixed(precision)}%`;
