import moment from 'moment';
import React from 'react';
import { useDispatch } from 'react-redux';
import { deleteCardAction } from '../actionCreators/databaseActions';
import { motion } from 'framer-motion';
import InfoTooltip from '../components/InfoTooltip';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

function Card({
	id,
	expenseId,
	amount,
	selectedDate,
	selectedCloseDate,
	selectedExpirationDate,
	currencyQuantity,
	currencyExchangeRate,
	comment,
	category,
	name,
	setName,
	setAmount,
	setComment,
	setCategory,
	setSelectedDate,
	setIsCreditCardCategory,
	setIsBuyCurrenciesCategory,
	setIsCurrencyIncomeCategory,
	setSelectedCloseDate,
	setSelectedExpirationDate,
	setCurrencyQuantity,
	setCurrencyExchangeRate,
	setEdit,
	setExpenseId,
	categories,
	openModal,
}) {
	const dispatch = useDispatch();

	const handleDelete = () => {
		dispatch(deleteCardAction(id));
	};

	const handleEdit = () => {
		openModal();
		setName(name);
		setAmount(amount);
		setComment(comment);
		setCategory(category);
		setSelectedDate(selectedDate);
		setSelectedCloseDate(selectedCloseDate);
		setSelectedExpirationDate(selectedExpirationDate);
		setCurrencyQuantity(currencyQuantity);
		setCurrencyExchangeRate(currencyExchangeRate);
		setIsCreditCardCategory(category?.includes('Resumen tarjeta'));
		setIsBuyCurrenciesCategory(category?.includes('Compra divisas'));
		setIsCurrencyIncomeCategory(category?.includes(INGRESO_DIVISAS_CATEGORY));
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
			<div className='flex flex-col gap-y-1 justify-evenly items-start'>
				<p className='font-semibold text-base text-gray-400'>
					<span className='text-indigo-600 dark:text-indigo-300'>Nombre: </span>
					{name}
				</p>

				<p className='font-semibold text-base text-gray-400'>
					<span className='text-indigo-600 dark:text-indigo-300'>
						Descripción:{' '}
					</span>{' '}
					{comment}
				</p>
				<div className='flex flex-row gap-x-1 items-stretch'>
					<p className='font-semibold text-base text-gray-400'>
						<span className='text-indigo-600 dark:text-indigo-300'>
							Categoría:{' '}
						</span>
						{category}{' '}
						<InfoTooltip
							placement={'top'}
							content={categories
								.filter((c) => c.name === category)
								.map((c) => c?.description)}
						/>
					</p>
				</div>

				{category.includes('Resumen tarjeta') && (
					<>
						<p className='font-semibold text-base text-gray-400 ml-2'>
							<span className='text-indigo-600 dark:text-indigo-300'>
								Fecha de Cierre:{' '}
							</span>
							{moment(selectedCloseDate).format('DD/MM/YYYY')}
						</p>
						<p className='font-semibold text-base text-gray-400 ml-2'>
							<span className='text-indigo-600 dark:text-indigo-300'>
								Fecha de vencimiento:{' '}
							</span>
							{moment(selectedExpirationDate).format('DD/MM/YYYY')}
						</p>
					</>
				)}

				{category.includes('Compra divisas') && (
					<>
						<p className='font-semibold text-base text-gray-400 ml-2'>
							<span className='text-indigo-600 dark:text-indigo-300'>
								Cantidad:{' '}
							</span>
							{`$USD ${currencyQuantity}`}
						</p>
						<p className='font-semibold text-base text-gray-400 ml-2'>
							<span className='text-indigo-600 dark:text-indigo-300'>
								Cotización:{' '}
							</span>
							{`$AR ${currencyExchangeRate}`}
						</p>
					</>
				)}

				<p className='font-semibold text-base text-gray-400'>
					<span className='text-indigo-600 dark:text-indigo-300'>
						Fecha transacción:{' '}
					</span>
					{moment(selectedDate).format('DD/MM/YYYY')}
				</p>
				<div className='flex flex-row gap-x-2 lg:justify-between items-stretch'>
					<h1
						className={`font-Nunito font-medium text-lg ${
							categories
								?.filter((c) => c.isExpense)
								.map((c) => c.name)
								.includes(category)
								? `text-red-500`
								: `text-green-500`
						}`}
					>
						{category.includes(INGRESO_DIVISAS_CATEGORY)
							? `$USD ${currencyQuantity}`
							: `$AR 
						${
							categories
								.filter((c) => c.isExpense)
								.map((c) => c.name)
								.includes(category)
								? `-${parseFloat(amount)?.toLocaleString()}`
								: `+${parseFloat(amount)?.toLocaleString()}`
						}
						`}
					</h1>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						className='h-6 w-6 cursor-pointer dark:text-white'
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
						className='h-6 w-6 cursor-pointer w-6 h-6 dark:text-white'
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
			</div>
		</motion.div>
	);
}

export default Card;
