import React from 'react';
import { FiSearch, FiX, FiSliders } from 'react-icons/fi';

const PERIOD_NAMES = {
  day: 'día',
  week: 'semana',
  month: 'mes',
  year: 'año',
  total: 'todo el historial',
};

const fieldClass = 'min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-purple-400';

function SearchBar({
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  transactionType,
  onTypeChange,
  categories = [],
  resultCount,
  totalCount,
  selectedFilter,
  onClear,
  onViewAll,
  disabled = false,
}) {
  const active = Boolean(query.trim() || selectedCategory || transactionType !== 'all');
  const periodLabel = PERIOD_NAMES[selectedFilter] || 'período seleccionado';
  const categoryOptions = [...new Set(
    (categories || []).map((entry) => entry?.name).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'es-AR'));

  return (
    <section aria-label='Buscar y filtrar transacciones' className='mb-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='min-w-0 flex-1'>
          <label htmlFor='transaction-search' className='mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200'>
            Buscar movimientos
          </label>
          <div className='relative'>
            <FiSearch size={19} aria-hidden='true' className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400' />
            <input
              id='transaction-search'
              name='transaction-search'
              type='search'
              autoComplete='off'
              enterKeyHint='search'
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur(); // dismiss the mobile keyboard without reloading.
                }
                if (event.key === 'Escape') {
                  onQueryChange('');
                  event.currentTarget.blur();
                }
              }}
              placeholder='Nombre, descripción, categoría, importe…'
              disabled={disabled}
              className={fieldClass + ' pl-10 pr-11'}
              aria-describedby='transactions-search-hint transactions-search-count'
            />
            {query.length > 0 && (
              <button
                type='button'
                onClick={() => onQueryChange('')}
                disabled={disabled}
                aria-label='Borrar texto de búsqueda'
                title='Borrar texto'
                className='absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800'
              >
                <FiX aria-hidden='true' size={19} />
              </button>
            )}
          </div>
        </div>
        {active && (
          <button
            type='button'
            onClick={onClear}
            disabled={disabled}
            className='inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          >
            <FiX aria-hidden='true' /> Limpiar filtros
          </button>
        )}
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <div className='min-w-0'>
          <label htmlFor='transaction-category-filter' className='mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300'>
            <FiSliders aria-hidden='true' /> Categoría
          </label>
          <select
            id='transaction-category-filter'
            value={selectedCategory}
            onChange={(event) => onCategoryChange(event.target.value)}
            disabled={disabled}
            className={fieldClass}
          >
            <option value=''>Todas las categorías</option>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className='min-w-0'>
          <label htmlFor='transaction-type-filter' className='mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300'>
            Tipo de movimiento
          </label>
          <select
            id='transaction-type-filter'
            value={transactionType}
            onChange={(event) => onTypeChange(event.target.value)}
            disabled={disabled}
            className={fieldClass}
          >
            <option value='all'>Todos los movimientos</option>
            <option value='expense'>Solo gastos</option>
            <option value='income'>Solo ingresos</option>
          </select>
        </div>
      </div>

      <div className='mt-3 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between'>
        <p id='transactions-search-count' role='status' aria-live='polite' className='font-semibold'>
          {disabled ? 'Cargando movimientos…' : resultCount + ' de ' + totalCount + ' movimientos'}
          {active && !disabled ? ' coinciden con tus filtros' : ''}
        </p>
        <p id='transactions-search-hint'>
          Buscando en: <strong>{periodLabel}</strong>
          {selectedFilter !== 'total' && (
            <>
              {' · '}
              <button type='button' disabled={disabled} onClick={onViewAll}
                className='font-bold text-purple-700 underline underline-offset-2 hover:text-purple-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 dark:text-purple-300 dark:hover:text-purple-200'>
                Ver todo el historial
              </button>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

export default SearchBar;
