import React from 'react';
import { Link } from 'react-router-dom';
import { FaChartPie, FaPlus, FaUniversity, FaEllipsisH, FaExchangeAlt } from 'react-icons/fa';

const destinations = [
  { id:'transactions', href:'/transacciones', label:'Transacciones', Icon:FaExchangeAlt },
  { id:'portfolio', href:'/portfolio', label:'Portfolio', Icon:FaChartPie },
  { id:'banks', href:'/bancos', label:'Bancos', Icon:FaUniversity },
];

// All signed-in financial pages use precisely the same header control hierarchy.
// Only the primary action/label and current route differ between pages.
export default function FinancialHeaderActions({
  primaryLabel, onPrimaryAction, primaryDisabled = false,
  valuesVisible, onTogglePrivacy,
  visibleIcon, hiddenIcon,
  currentSection,
}) {
  const privacyLabel = valuesVisible ? 'Ocultar importes de la pantalla' : 'Mostrar importes de la pantalla';
  const links = destinations.filter((item) => item.id !== currentSection);
  return (
    <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto'
      aria-label={'Acciones de ' + (currentSection === 'banks' ? 'bancos' : currentSection === 'portfolio' ? 'portfolio' : 'transacciones')}>
      <button type='button' onClick={onPrimaryAction} disabled={primaryDisabled}
        className='inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50 sm:flex-none'>
        <FaPlus aria-hidden='true' />
        {primaryLabel}
      </button>
      <button type='button' onClick={onTogglePrivacy} aria-pressed={!valuesVisible}
        aria-label={privacyLabel} title={valuesVisible ? 'Ocultar importes' : 'Mostrar importes'}
        className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'>
        <img className='h-5 w-5' alt='' src={valuesVisible ? visibleIcon : hiddenIcon} />
      </button>
      <details className='group relative shrink-0'>
        <summary className='flex min-h-[44px] cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 [&::-webkit-details-marker]:hidden'>
          <FaEllipsisH aria-hidden='true' /> Más
        </summary>
        <div className='absolute right-0 top-full z-30 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-800'>
          {links.map(({id,href,label,Icon}) => (
            <Link key={id} to={href}
              className='flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-800 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-100 dark:hover:bg-slate-700'>
              <Icon aria-hidden='true' />{label}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
