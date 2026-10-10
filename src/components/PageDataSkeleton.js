import React from 'react';

// One visual language for first-load placeholders on both financial pages.
// Placeholders show real page structure, never artificial zero-valued balances.
const Block = ({ className = '' }) => (
  <div className={`rounded-lg bg-slate-200 dark:bg-slate-700/80 ${className}`} />
);

const Surface = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
    {children}
  </section>
);

const SectionHeading = () => (
  <>
    <Block className='h-3 w-20' />
    <Block className='mt-3 h-6 w-44 max-w-full' />
    <Block className='mt-3 h-3 w-3/4 max-w-sm' />
  </>
);

const ListRows = () => (
  <div className='mt-5 space-y-3'>
    {[0, 1, 2, 3].map((row) => (
      <div key={row} className='rounded-xl border border-slate-200 p-4 dark:border-slate-700'>
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0 flex-1 space-y-2'>
            <Block className='h-4 w-3/5' />
            <Block className='h-3 w-1/3' />
          </div>
          <Block className='h-5 w-20 shrink-0' />
        </div>
      </div>
    ))}
  </div>
);

const SummaryCard = () => (
  <Surface>
    <SectionHeading />
    <div className='mt-6 grid grid-cols-2 gap-4'>
      {[0, 1].map((col) => (
        <div key={col} className='space-y-3'>
          <Block className='h-4 w-20' />
          <Block className='h-7 w-28 max-w-full' />
        </div>
      ))}
    </div>
  </Surface>
);

const ChartCard = () => (
  <Surface>
    <SectionHeading />
    <Block className='mt-5 h-44 w-full rounded-xl' />
  </Surface>
);

const PageDataSkeleton = ({ variant = 'transactions', withKpiCards = true }) => (
  <div
    role='status'
    aria-label={variant === 'portfolio' ? 'Cargando portfolio' : 'Cargando transacciones'}
    className='animate-pulse motion-reduce:animate-none'
  >
    <span className='sr-only'>
      {variant === 'portfolio' ? 'Cargando datos del portfolio' : 'Cargando datos de transacciones'}
    </span>
    {variant === 'portfolio' ? (
      <div className='space-y-5'>
        {withKpiCards && <div className='grid grid-cols-3 gap-2 sm:gap-4'>
          {[0, 1, 2].map((item) => (
            <Surface key={item} className='min-w-0'>
              <Block className='h-5 w-5' />
              <Block className='mt-3 h-7 w-16 max-w-full' />
              <Block className='mt-3 h-3 w-20 max-w-full' />
            </Surface>
          ))}
        </div>}
        <SummaryCard />
        <ChartCard />
        <Surface><SectionHeading /><ListRows /></Surface>
      </div>
    ) : (
      <div className='grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-3'>
        <div className='space-y-5'>
          <SummaryCard />
          <ChartCard />
        </div>
        <Surface className='min-w-0 lg:col-span-2'>
          <SectionHeading />
          <Block className='mt-5 h-10 w-full rounded-xl' />
          <ListRows />
        </Surface>
      </div>
    )}
  </div>
);

export default PageDataSkeleton;
