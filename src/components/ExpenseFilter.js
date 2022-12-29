import { React, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { filterDataAction } from '../actionCreators/databaseActions';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import es from 'date-fns/locale/es';
import moment from 'moment';

const ExpenseFilter = () => {
	const [selectedDate, setSelectedDate] = useState(null);
	const [selectedFilter, setSelectedFilter] = useState('year');

	const dispatch = useDispatch();
	const user = useSelector((state) => state.auth.user);

	const handleFilterClick = (filterType) => {
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

	registerLocale('es', es);

	return (
		<>
			<div className='flex flex-col'>
				<div className='flex justify-center gap-x-2 p-4'>
					<button
						className={`px-4 py-2 rounded-lg ${
							selectedFilter === 'year' ? 'bg-indigo-500' : 'bg-gray-300'
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('year')}
					>
						Año
					</button>
					<button
						className={`px-4 py-2 rounded-lg ${
							selectedFilter === 'month' ? 'bg-indigo-500' : 'bg-gray-300'
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('month')}
					>
						Mes
					</button>
					<button
						className={`px-4 py-2 rounded-lg ${
							selectedFilter === 'week' ? 'bg-indigo-500' : 'bg-gray-300'
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('week')}
					>
						Semana
					</button>
					<button
						className={`px-4 py-2 rounded-lg ${
							selectedFilter === 'day' ? 'bg-indigo-500' : 'bg-gray-300'
						} hover:scale-105 hover:opacity-75`}
						onClick={() => handleFilterClick('day')}
					>
						Día
					</button>
				</div>
				<div className='flex justify-center gap-x-3'>
					<DatePicker
						className='text-center cursor-pointer rounded-lg py-2 bg-gray-200 hover:scale-105 hover:opacity-75 focus:outline-none focus:shadow-outline-purple'
						selected={selectedDate}
						onChange={(date) => handleDateChange(date, dispatch)}
						locale='es'
						showYearDropdown
						scrollableMonthYearDropdown
						placeholderText='Elegir fecha'
						todayButton='Hoy'
						todayButtonClassName='bg-blue-500'
						clearButtonClassName='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
						withPortal={true}
						dateFormat='dd/MM/yyyy'
					/>
					<button
						className='px-4 py-2 rounded-lg bg-red-500 hover:scale-105 hover:opacity-75'
						onClick={() => {
							setSelectedFilter('');
							setSelectedDate('');
							handleFilterClick('year');
						}}
					>
						Borrar
					</button>
				</div>
			</div>
		</>
	);
};

export default ExpenseFilter;
