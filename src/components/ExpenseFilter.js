import es from 'date-fns/locale/es';
import moment from 'moment';
import 'moment/locale/es';
import React, { useEffect, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/ltc-datepicker.css';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import {
  filterDataAction,
  getTotalBalance,
  setSelectedFilter,
  setFilterChanging,
} from '../actionCreators/databaseActions';

registerLocale('es', es);

const periods = [
  { key: 'year', label: 'Año' },
  { key: 'month', label: 'Mes' },
  { key: 'week', label: 'Semana', short: 'Sem.' },
  { key: 'day', label: 'Día' },
  { key: 'total', label: 'Todo' },
];

export const describeSelectedPeriod = (filter, date) => {
  const anchor = moment(date).locale('es');
  if (!anchor.isValid()) return 'Elegí un período';
  switch (filter) {
    case 'year': return anchor.format('YYYY');
    case 'month': return anchor.format('MMMM YYYY');
    case 'week':
      return anchor.clone().startOf('week').format('DD/MM') + ' – ' +
        anchor.clone().endOf('week').format('DD/MM/YYYY');
    case 'day': return anchor.format('DD/MM/YYYY');
    case 'total': return 'Todo el historial';
    default: return 'Elegí un período';
  }
};

const CalendarTrigger = React.forwardRef(({ onClick, disabled }, ref) => (
  <button
    type='button'
    ref={ref}
    onClick={onClick}
    disabled={disabled}
    aria-label='Elegir fecha de referencia'
    title='Cambiar fecha de referencia'
    className='inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-purple-400 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-purple-400 dark:hover:text-purple-200'
  >
    <FiCalendar size={17} aria-hidden='true' />
    <span className='hidden min-[370px]:inline'>Fecha</span>
    <FiChevronDown size={13} aria-hidden='true' />
  </button>
));

CalendarTrigger.displayName = 'CalendarTrigger';

/** Reuses the installed react-datepicker 4.x custom-header API. */
export function CalendarHeader({
  date, decreaseMonth, increaseMonth, changeMonth, changeYear,
  prevMonthButtonDisabled, nextMonthButtonDisabled,
}) {
  const monthNames = moment(date).locale('es').localeData().months();
  const currentYear = new Date().getFullYear();
  const firstYear = Math.min(1990, date.getFullYear() - 10);
  const lastYear = Math.max(currentYear + 5, date.getFullYear() + 5);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  return (
    <div className='ltc-calendar__header'>
      <button type='button' className='ltc-calendar__nav'
        onClick={decreaseMonth} disabled={prevMonthButtonDisabled}
        aria-label='Mes anterior' title='Mes anterior'>
        <FiChevronLeft size={20} aria-hidden='true' />
      </button>
      <div className='ltc-calendar__controls'>
        <label htmlFor='ltc-calendar-month' className='sr-only'>Mes del calendario</label>
        <select id='ltc-calendar-month' className='ltc-calendar__select ltc-calendar__select--month'
          aria-label='Mes del calendario' value={date.getMonth()}
          onChange={(event) => changeMonth(Number(event.target.value))}>
          {monthNames.map((name, month) => (
            <option key={name} value={month}>{name}</option>
          ))}
        </select>
        <label htmlFor='ltc-calendar-year' className='sr-only'>Año del calendario</label>
        <select id='ltc-calendar-year' className='ltc-calendar__select ltc-calendar__select--year'
          aria-label='Año del calendario' value={date.getFullYear()}
          onChange={(event) => changeYear(Number(event.target.value))}>
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <button type='button' className='ltc-calendar__nav'
        onClick={increaseMonth} disabled={nextMonthButtonDisabled}
        aria-label='Mes siguiente' title='Mes siguiente'>
        <FiChevronRight size={20} aria-hidden='true' />
      </button>
    </div>
  );
}


function ExpenseFilter({ onPeriodChange }) {
  const dispatch = useDispatch();
  const selectedFilter = useSelector((state) => state.database.selectedFilter);
  const isFilterChanging = useSelector((state) => state.database.isFilterChanging);
  const userId = useSelector((state) => state.auth.user?.uid);
  const [selectedDate, setSelectedDate] = useState(() => moment().startOf('day').toDate());

  const selectPeriod = async (period, referenceDate = selectedDate) => {
    if (!userId || isFilterChanging || !referenceDate) return;
    dispatch(setFilterChanging(true));
    dispatch(setSelectedFilter(period));
    try {
      if (period === 'total') {
        await dispatch(getTotalBalance(userId));
      } else {
        const reference = moment(referenceDate).locale('es');
        await dispatch(filterDataAction(
          userId,
          period,
          reference.year(),
          reference.month(),
          reference.week(),
          reference.date()
        ));
      }
    } finally {
      dispatch(setFilterChanging(false));
    }
  };

  const onDateChange = (date) => {
    if (!date || isFilterChanging) return;
    setSelectedDate(date);
    // Preserve month/week/year when changing their reference date.
    // In "Todo" mode a date selection explicitly switches to that day.
    const period = selectedFilter === 'total' ? 'day' : selectedFilter;
    selectPeriod(period || 'day', date);
  };

  const periodLabel = describeSelectedPeriod(selectedFilter, selectedDate);
  // Keep the export's period label in sync even when the date is changed
  // inside this picker (the Redux filter stores only the period key).
  useEffect(() => {
    if (typeof onPeriodChange === 'function') onPeriodChange({ key: selectedFilter, label: periodLabel });
  }, [onPeriodChange, periodLabel, selectedFilter]);

  return (
    <section aria-label='Filtrar por período' className='mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900/70 sm:p-4'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='min-w-0'>
          <p className='text-[11px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300'>
            Período
          </p>
          <p className='mt-0.5 truncate text-sm font-semibold capitalize text-slate-800 dark:text-slate-100'
            aria-live='polite' aria-atomic='true'>
            {periodLabel}
          </p>
        </div>
        <DatePicker
          selected={selectedDate}
          disabled={isFilterChanging || !userId}
          onChange={onDateChange}
          customInput={<CalendarTrigger />}
          locale='es'
          withPortal
          calendarClassName='ltc-calendar'
          renderCustomHeader={(props) => <CalendarHeader {...props} />}
          dateFormat='dd/MM/yyyy'
          showPopperArrow={false}
          todayButton='Hoy'
        />
      </div>

      <div role='group' aria-label='Tipo de período' className='grid grid-cols-5 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800'>
        {periods.map(({ key, label, short }) => {
          const active = selectedFilter === key;
          return (
            <button key={key} type='button'
              aria-label={label}
              aria-pressed={active}
              disabled={isFilterChanging || !userId}
              onClick={() => selectPeriod(key)}
              className={'min-h-[40px] min-w-0 rounded-lg px-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-wait disabled:opacity-50 sm:text-sm ' +
                (active
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-slate-700')}
            >
              {short ? (
                <>
                  <span className='sm:hidden'>{short}</span>
                  <span className='hidden sm:inline'>{label}</span>
                </>
              ) : label}
            </button>
          );
        })}
      </div>
      {isFilterChanging && (
        <span role='status' className='sr-only'>Actualizando movimientos y totales…</span>
      )}
    </section>
  );
}

export default ExpenseFilter;
