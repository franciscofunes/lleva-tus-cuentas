import moment from 'moment';
import React from 'react';
import { useDispatch } from 'react-redux';
import { deleteCardAction } from '../actionCreators/databaseActions';
import { motion } from 'framer-motion';

function Card({
	id,
	amount,
	selectedDate,
	comment,
	category,
	name,
	setName,
	setAmount,
	setComment,
	setCategory,
	setSelectedDate,
	setEdit,
	setExpenseId,
}) {
	const dispatch = useDispatch();

	const handleDelete = () => {
		dispatch(deleteCardAction(id));
	};

	const handleEdit = () => {
		setName(name);
		setAmount(amount);
		setComment(comment);
		setCategory(category);
		setSelectedDate(selectedDate);
		setExpenseId(id);
		setEdit(true);
	};

	return (
		<motion.div
			animate={{ opacity: 1 }}
			initial={{ opacity: 0 }}
			transition={{ duration: 0.4, type: 'tween', delay: 0.2 }}
			id='card'
			className='lg:flex border-b-2 border-purple-400 w-full mb-2 justify-between items-center py-3 px-4 font-Nunito dark:border-indigo-400'
		>
			<div className='flex flex-col justify-evenly items-start'>
				<p className='font-semibold text-base text-gray-400'>
					<span className='text-purple-600'>Nombre: </span>
					{name}
				</p>
				<p className='font-semibold text-base text-gray-400'>
					<span className='text-purple-600'>Categoría: </span>
					{category}
				</p>
				<p className='font-semibold text-base text-gray-400'>
					<span className='text-purple-600'>Descripción: </span> {comment}
				</p>
				<p className='font-semibold text-base text-gray-400'>
					<span className='text-purple-600'>Fecha: </span>
					{moment(selectedDate).format('DD/MM/YYYY')}
				</p>
			</div>
			<div className='flex lg:justify-between items-center'>
				<h1
					className={`font-Nunito font-medium text-lg ${
						amount[0] === '-' ? `text-red-500` : `text-green-500`
					}`}
				>
					{`$AR ${amount}`}
				</h1>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					className='h-6 w-6 ml-3 cursor-pointer dark:text-white'
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'
					onClick={handleDelete}
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth='2'
						d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
					/>
				</svg>

				<svg
					xmlns='http://www.w3.org/2000/svg'
					fill='none'
					className='h-6 w-6 ml-3 cursor-pointer w-6 h-6 dark:text-white'
					viewBox='0 0 24 24'
					strokeWidth='1.5'
					stroke='currentColor'
					onClick={handleEdit}
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						d='M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10'
					/>
				</svg>
			</div>
		</motion.div>
	);
}

export default Card;
