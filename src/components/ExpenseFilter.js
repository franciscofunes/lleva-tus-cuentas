import es from 'date-fns/locale/es';
import moment from 'moment';
import 'moment/locale/es';
import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDispatch, useSelector } from 'react-redux';
import {
	filterDataAction,
	getTotalBalance,
	setSelectedFilter,
	setSelectedDate as setSelectedDateAction,
	setFilterChanging,
} from '../actionCreators/databaseActions';

const DatePickerButton = React.forwardRef(({ value, onClick, disabled }, ref) => (
	<button
		type='button'
		ref={ref}
		onClick={onClick}
		disabled={disabled}
		className='w-full disabled:cursor-wait disabled:opacity-60 text-center cursor-pointer rounded-xl py-2.5 px-4 bg-white text-slate-900 border border-slate-300 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-900 dark:text-white dark:border-slate-600'
		aria-label='Elegir fecha'
	>
		{value || 'Elegir fecha'}
	</button>
));

const ExpenseFilter = () => {
	const dispatch = useDispatch();
	const [selectedDate, setSelectedDate] = useState(
		moment().startOf('day').toDate()
	);
	const selectedFilter = useSelector((state) => state.database.selectedFilter);
	const isFilterChanging = useSelector(
		(state) => state.database.isFilterChanging
	);
	const user = useSelector((state) => state.auth.user);

	const handleFilterClick = async (filterType) => {
		dispatch(setFilterChanging(true));
		dispatch(setSelectedFilter(filterType));

		try {
			if (filterType?.includes('total')) {
				await dispatch(getTotalBalance(user.uid));
				return;
			}

			const year = moment(selectedDate).year();
			const month = moment(selectedDate).month();
			const week = moment(selectedDate).week();
			const day = moment(selectedDate).date();

			await dispatch(
				filterDataAction(user.uid, filterType, year, month, week, day)
			);
		} finally {
			dispatch(setFilterChanging(false));
		}
	};

	const handleDateChange = async (selectedDate, dispatch) => {
		const year = moment(selectedDate).year();
		const month = moment(selectedDate).month();
		const week = moment(selectedDate).week();
		const day = moment(selectedDate).date();

		setSelectedDate(selectedDate);
		dispatch(setSelectedDateAction(moment(selectedDate).format('YYYY-MM-DD')));
		dispatch(setSelectedFilter('day'));
		dispatch(setFilterChanging(true));

		try {
			await dispatch(
				filterDataAction(user.uid, 'day', year, month, week, day)
			);
		} finally {
			dispatch(setFilterChanging(false));
		}
	};

	const getFormattedDate = (selectedDate) => {
		return selectedDate.toDateString() === new Date().toDateString()
			? `Hoy ${moment(selectedDate).format('DD/MM/YYYY')}`
			: moment(selectedDate)
					.locale('es')
					.format('dddd, DD/MM/YYYY')
					.replace(/^\w/, (c) => c.toUpperCase());
	};

	registerLocale('es', es);
	moment.updateLocale('es');

	return (
		<>
			<div className='flex flex-col gap-y-5 justify-center'>
				{isFilterChanging && (
					<span className='sr-only' role='status'>Actualizando movimientos y totales…</span>
				)}
				<div className='flex justify-evenly gap-x-2'>
					<button
						className={`px-4 rounded-lg ${
							selectedFilter === 'year'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100`}
						disabled={isFilterChanging}
						onClick={() => handleFilterClick('year')}
					>
						Año
					</button>
					<button
						className={`px-4 rounded-lg ${
							selectedFilter === 'month'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100`}
						disabled={isFilterChanging}
						onClick={() => handleFilterClick('month')}
					>
						Mes
					</button>
					<button
						className={`px-4 rounded-lg ${
							selectedFilter === 'week'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100`}
						disabled={isFilterChanging}
						onClick={() => handleFilterClick('week')}
					>
						Semana
					</button>
					<button
						className={`px-4 py-2 rounded-lg ${
							selectedFilter === 'day'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100`}
						disabled={isFilterChanging}
						onClick={() => handleFilterClick('day')}
					>
						Día
					</button>
				</div>

				<div className='flex items-center justify-center flex-col gap-x-3 gap-y-5'>
					<button
						className={`px-4 py-2 rounded-lg ${
							selectedFilter === 'total'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100`}
						disabled={isFilterChanging}
						onClick={() => handleFilterClick('total')}
					>
						Balance Total
					</button>

					<DatePicker
						selected={selectedDate}
						disabled={isFilterChanging}
						onChange={(date) => handleDateChange(date, dispatch)}
						value={getFormattedDate(selectedDate)}
						customInput={<DatePickerButton />}
						locale='es'
						showYearDropdown
						scrollableMonthYearDropdown
						dropdownMode='scroll'
						placeholderText='Elegir fecha'
						todayButton='Hoy'
						todayButtonClassName='bg-blue-500'
						clearButtonClassName='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
						withPortal={true}
						dateFormat='dd/MM/yyyy'
						disabledKeyboardNavigation={true}
					/>
				</div>
			</div>
		</>
	);
};

export default ExpenseFilter;
