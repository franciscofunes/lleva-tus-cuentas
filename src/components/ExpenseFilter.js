import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { filterDataAction } from '../actionCreators/databaseActions';

const ExpenseFilter = () => {
	const dispatch = useDispatch();
	const user = useSelector((state) => state.auth.user);

	const handleFilterClick = (filterType) => {
		dispatch(filterDataAction(user.uid, filterType));
	};

	return (
		<div className='flex justify-center gap-x-2 p-5'>
			<button
				className='px-4 py-2 rounded-lg bg-indigo-500 hover:bg-gray-300'
				onClick={() => handleFilterClick('year')}
			>
				Año
			</button>
			<button
				className='px-4 py-2 rounded-lg bg-indigo-500 hover:bg-gray-300'
				onClick={() => handleFilterClick('month')}
			>
				Mes
			</button>
			<button
				className='px-4 py-2 rounded-lg bg-indigo-500 hover:bg-gray-300'
				onClick={() => handleFilterClick('week')}
			>
				Semana
			</button>
			<button
				className='px-4 py-2 rounded-lg bg-indigo-500 hover:bg-gray-300'
				onClick={() => handleFilterClick('day')}
			>
				Día
			</button>
		</div>
	);
};

export default ExpenseFilter;
