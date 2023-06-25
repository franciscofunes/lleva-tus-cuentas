import es from 'date-fns/locale/es';
import moment from 'moment';
import 'moment/locale/es';
import { React, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDispatch, useSelector } from 'react-redux';
import {
	filterDataAction,
	getTotalBalance,
} from '../actionCreators/databaseActions';

const ExpenseFilter = () => {
	const [selectedDate, setSelectedDate] = useState(
		moment().startOf('day').toDate()
	);
	const [selectedFilter, setSelectedFilter] = useState('month');

	const dispatch = useDispatch();

	const user = useSelector((state) => state.auth.user);

	const handleFilterClick = (filterType) => {
		if (filterType?.includes('total')) {
			setSelectedFilter(filterType);

			return dispatch(getTotalBalance(user.uid));
		}

		setSelectedFilter(filterType);

		dispatch(
			filterDataAction(
				user.uid,
				filterType,
				moment(selectedDate).year(),
				moment(selectedDate).month(),
				moment(selectedDate).week(),
				moment(selectedDate).date()
			)
		);
	};

	const handleDateChange = (selectedDate, dispatch) => {
		const year = moment(selectedDate).year();
		const month = moment(selectedDate).month();
		const week = moment(selectedDate).week();
		const day = moment(selectedDate).date();

		setSelectedDate(selectedDate);
		setSelectedFilter('day');

		dispatch(filterDataAction(user.uid, 'day', year, month, week, day));
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
			<div className='flex flex-col gap-y-5'>
				<div className='flex justify-evenly gap-x-2'>
					<button
						className={`px-4 rounded-lg ${
							selectedFilter === 'year'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('year')}
					>
						Año
					</button>
					<button
						className={`px-4 rounded-lg ${
							selectedFilter === 'month'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('month')}
					>
						Mes
					</button>
					<button
						className={`px-4 rounded-lg ${
							selectedFilter === 'week'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('week')}
					>
						Semana
					</button>
					<button
						className={`px-4 py-2 rounded-lg ${
							selectedFilter === 'day'
								? 'bg-indigo-500 text-white'
								: 'bg-gray-200 text-black'
						} hover:scale-105 hover:opacity-75`}
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
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('total')}
					>
						Balance Total
					</button>

					<DatePicker
						className='text-center cursor-pointer rounded-lg py-2 bg-gray-200 hover:scale-105 hover:opacity-75 focus:outline-none focus:shadow-outline-purple'
						selected={selectedDate}
						onChange={(date) => handleDateChange(date, dispatch)}
						value={getFormattedDate(selectedDate)}
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
