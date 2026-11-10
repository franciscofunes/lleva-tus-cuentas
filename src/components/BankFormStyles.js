// One financial form language for the bank onboarding modal and inline editors.
// Keep controls 16px on phones to avoid Safari's focus zoom and align with LTC panels.
export const BANK_FORM_STYLES = Object.freeze({
  label: 'block min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200',
  input: 'mt-1 min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 font-sans text-base text-slate-900 focus-visible:border-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50',
  primary: 'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-slate-900',
  secondary: 'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
});
