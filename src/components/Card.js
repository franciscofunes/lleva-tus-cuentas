import moment from 'moment';
import React from 'react';
import { useDispatch } from 'react-redux';
import { deleteCardAction } from '../actionCreators/databaseActions';
import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';
import { FiEdit3, FiTrash2 } from 'react-icons/fi';
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
			role='article'
			aria-label={`Movimiento: ${name || 'Sin nombre'}`}
			className='mb-3 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3.5 shadow-sm transition-colors hover:border-violet-300 sm:px-4 sm:py-4 dark:border-slate-700/90 dark:bg-slate-900/45 dark:hover:border-violet-500/50'
		>
			<div className='min-w-0 space-y-1.5'>
				<p className='min-w-0 break-words text-base font-bold leading-relaxed text-slate-950 dark:text-slate-100'>
					<span className='font-semibold text-violet-700 dark:text-violet-300'>Nombre: </span>
					{name}
				</p>

				<p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300'>
					<span className='font-semibold text-violet-700 dark:text-violet-300'>
						Descripción:{' '}
					</span>{' '}
					{comment}
				</p>
				<div className='min-w-0'>
					<p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300'>
						<span className='font-semibold text-violet-700 dark:text-violet-300'>
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
						<p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300'>
							<span className='font-semibold text-violet-700 dark:text-violet-300'>
								Fecha de Cierre:{' '}
							</span>
							{moment(selectedCloseDate).format('DD/MM/YYYY')}
						</p>
						<p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300'>
							<span className='font-semibold text-violet-700 dark:text-violet-300'>
								Fecha de vencimiento:{' '}
							</span>
							{moment(selectedExpirationDate).format('DD/MM/YYYY')}
						</p>
					</>
				)}

				{safeCategory.includes('Compra divisas') && (
					<>
						<p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300'>
							<span className='font-semibold text-violet-700 dark:text-violet-300'>
								Cantidad:{' '}
							</span>
							{`$USD ${currencyQuantity}`}
						</p>
						<p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300'>
							<span className='font-semibold text-violet-700 dark:text-violet-300'>
								Cotización:{' '}
							</span>
							{`$AR ${currencyExchangeRate}`}
						</p>
					</>
				)}

				<p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300'>
					<span className='font-semibold text-violet-700 dark:text-violet-300'>
						{selectedDateIsDueDate ? 'Fecha de vencimiento' : 'Fecha transacción'}:{' '}
					</span>
					{moment(selectedDate).format('DD/MM/YYYY')}
				</p>

				{displayTransactionCustomDetails(customDetails).length > 0 && (
          <div className='mt-2 space-y-1.5 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-300' aria-label='Datos adicionales de la transacción'>
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
				<div className='mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-200/90 pt-3 dark:border-slate-700/80'>
					<p
						className={`mr-auto min-w-0 break-words text-lg font-bold leading-6 tabular-nums sm:text-xl ${
							isExpense
								? 'text-rose-600 dark:text-rose-400'
								: 'text-emerald-600 dark:text-emerald-400'
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
					</p>
					<div className='ml-auto flex shrink-0 items-center gap-2'>
						<button type='button' onClick={handleDelete} aria-label={`Eliminar ${name || 'movimiento'}`} title='Eliminar movimiento'
							className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-rose-500/70 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'>
							<FiTrash2 className='h-[18px] w-[18px]' aria-hidden='true' />
						</button>
						<button type='button' onClick={handleEdit} aria-label={`Editar ${name || 'movimiento'}`} title='Editar movimiento'
							className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-400/70 dark:hover:bg-violet-500/10 dark:hover:text-violet-300'>
							<FiEdit3 className='h-[18px] w-[18px]' aria-hidden='true' />
						</button>
					</div>
				</div>
			</div>
			{safeCategory.includes('Resumen tarjeta') && (
				<div className='mt-3 min-w-0 border-t border-slate-200/80 pt-2 dark:border-slate-700/80'>
					<CardStatementDetails expenseId={id} />
				</div>
			)}
		</motion.div>
	);
}

export default Card;
