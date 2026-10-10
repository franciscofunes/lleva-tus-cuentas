import moment from 'moment';
import React from 'react';
import { useDispatch } from 'react-redux';
import { deleteCardAction } from '../actionCreators/databaseActions';
import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';
import InfoTooltip from '../components/InfoTooltip';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';
import { usesSelectedDateAsDueDate } from '../utils/transactionDueDates';
import { displayTransactionCustomDetails } from '../utils/categoryExtraFields';
import CardStatementDetails from './CardStatementDetails';

function Card({
	id,
	expenseId,
	amount,
	selectedDate,
	selectedCloseDate,
	selectedExpirationDate,
	currencyQuantity,
	currencyExchangeRate,
	paymentStatus,
	paidAt,
	paidDueDate,
	comment,
	category,
	customDetails = {},
	setCustomDetails = () => {},
	setHasSavedCustomDetails = () => {},
	name,
	setName,
	setAmount,
	setComment,
	setCategory,
	setSelectedDate,
	setIsCreditCardCategory,
	setIsBuyCurrenciesCategory,
	setIsCurrencyIncomeCategory,
	setIsSellCurrenciesCategory,
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
	// Historical imports may omit a category while Firestore categories are still loading.
	const safeCategory = typeof category === 'string' ? category : '';
	const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];
	const isExpense = safeCategories.some((entry) => entry?.isExpense && entry.name === safeCategory);
	const selectedDateIsDueDate = usesSelectedDateAsDueDate(safeCategory, safeCategories);
	const isPaidBill = paymentStatus === 'paid';
	const paidAtDate =
		paidAt && typeof paidAt.toDate === 'function'
			? paidAt.toDate()
			: paidAt
				? new Date(paidAt)
				: null;

	const handleDelete = () => {
		dispatch(deleteCardAction(id));
	};

	const handleEdit = () => {
		openModal();
		setName(name);
		setAmount(amount);
		setComment(comment);
		setCategory(safeCategory);
		setCustomDetails(customDetails);
		setHasSavedCustomDetails(Boolean(Object.keys(customDetails || {}).length));
		setSelectedDate(selectedDate);
		setSelectedCloseDate(selectedCloseDate);
		setSelectedExpirationDate(selectedExpirationDate);
		setCurrencyQuantity(currencyQuantity);
		setCurrencyExchangeRate(currencyExchangeRate);
		setIsCreditCardCategory(safeCategory.includes('Resumen tarjeta'));
		setIsBuyCurrenciesCategory(safeCategory.includes('Compra divisas'));
		setIsCurrencyIncomeCategory(safeCategory.includes(INGRESO_DIVISAS_CATEGORY));
		setIsSellCurrenciesCategory(safeCategory.includes('Venta divisas'));
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
						{safeCategory || 'Sin categoría'}{' '}
						<InfoTooltip
							placement={'top'}
							content={safeCategories
								.filter((c) => c.name === category)
								.map((c) => c?.description)}
						/>
					</p>
				</div>

				{safeCategory.includes('Resumen tarjeta') && (
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

				{safeCategory.includes('Compra divisas') && (
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
						{selectedDateIsDueDate ? 'Fecha de vencimiento' : 'Fecha transacción'}:{' '}
					</span>
					{moment(selectedDate).format('DD/MM/YYYY')}
				</p>

				{displayTransactionCustomDetails(customDetails).length > 0 && (
          <div className='mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300' aria-label='Datos adicionales de la transacción'>
            {displayTransactionCustomDetails(customDetails).map((detail) => (
              <p key={detail.id}><span className='font-bold'>{detail.label}: </span>{detail.value}</p>
            ))}
          </div>
        )}

				{isPaidBill && (
					<div className='mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300'>
						<FaCheckCircle className='h-3.5 w-3.5' aria-hidden='true' />
						<span>Pagado</span>
						{paidDueDate && <span className='font-medium opacity-80'>Vencía {moment(paidDueDate).format('DD/MM/YYYY')}</span>}
						{paidAtDate && !Number.isNaN(paidAtDate.getTime()) && (
							<span className='font-medium opacity-80'>Pagado {moment(paidAtDate).format('DD/MM/YYYY')}</span>
						)}
					</div>
				)}
				<div className='flex flex-row gap-x-2 lg:justify-between items-stretch'>
					<h1
						className={`font-Nunito font-medium text-lg ${
							isExpense
								? `text-red-500`
								: `text-green-500`
						}`}
					>
						{safeCategory.includes(INGRESO_DIVISAS_CATEGORY)
							? `$USD ${currencyQuantity}`
							: `$AR 
						${
							isExpense
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
			{safeCategory.includes('Resumen tarjeta') && <CardStatementDetails expenseId={id} />}
		</motion.div>
	);
}

export default Card;
