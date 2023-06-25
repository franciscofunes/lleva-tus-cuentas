import React from 'react';
import { useForm } from 'react-hook-form';
import 'react-loading-skeleton/dist/skeleton.css';
import { useDispatch, useSelector } from 'react-redux';
import 'tippy.js/dist/tippy.css'; // optional
import {
	storeDataAction,
	updateDataAction,
} from '../actionCreators/databaseActions';
import InfoTooltip from '../components/InfoTooltip';
import { CATEGORY_INFO_TOOLTIP_MESSAGE } from '../shared/constants/tooltip-messages.const';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

const TransactionForm = ({
	amount,
	selectedDate,
	selectedCloseDate,
	selectedExpirationDate,
	currencyQuantity,
	currencyExchangeRate,
	comment,
	category,
	name,
	expenseId,
	isCreditCardCategory,
	isBuyCurrenciesCategory,
	isCurrencyIncomeCategory,
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
	edit,
	setEdit,
	categories,
	setIsOpen,
}) => {
	const dispatch = useDispatch();
	const user = useSelector((state) => state.auth.user);
	const isDataFetching = useSelector((state) => state.database.isDataFetching);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm();

	const onSubmit = () => {
		if (!edit) {
			dispatch(
				storeDataAction({
					userId: user?.uid,
					name,
					amount,
					comment,
					category,
					selectedDate,
					selectedExpirationDate,
					selectedCloseDate,
					currencyQuantity,
					currencyExchangeRate,
				})
			);

			setName('');
			setAmount('');
			setComment('');
			setCategory('');
			setSelectedDate('');
			setSelectedExpirationDate('');
			setSelectedCloseDate('');
			setCurrencyQuantity('');
			setCurrencyExchangeRate('');
			setIsBuyCurrenciesCategory(false);
			setIsCreditCardCategory(false);
			setIsCurrencyIncomeCategory(false);
			setIsOpen(false);
		} else {
			dispatch(
				updateDataAction(
					{
						userId: user.uid,
						name,
						amount,
						comment,
						category,
						selectedDate,
						selectedExpirationDate,
						selectedCloseDate,
						currencyQuantity,
						currencyExchangeRate,
					},
					expenseId
				)
			);

			setEdit(false);
			setName('');
			setAmount('');
			setComment('');
			setCategory('');
			setSelectedDate('');
			setSelectedExpirationDate('');
			setSelectedCloseDate('');
			setCurrencyQuantity('');
			setCurrencyExchangeRate('');
			setIsBuyCurrenciesCategory(false);
			setIsCreditCardCategory(false);
			setIsCurrencyIncomeCategory(false);
			setIsOpen(false);
		}
	};

	return (
		<>
			<form
				className='mb-0 mt-0 flex flex-col gap-y-2 space-y-1'
				onSubmit={handleSubmit(onSubmit)}
			>
				<h1 className='font-Nunito font-semibold text-xl dark:text-purple-500 underline'>
					{edit ? 'Editar transacción' : 'Crear transacción'}
				</h1>

				<label
					htmlFor='name'
					className='text-sm font-medium text-gray-700 dark:text-white'
				>
					Nombre transacción
				</label>

				<input
					className='w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
					value={name}
					type='text'
					id='name'
					{...register('name', {
						required: true,
						pattern: /^[A-Za-z0-9].{2,30}$/,
						onChange: (e) => {
							setName(e.target.value);
						},
					})}
					placeholder='Nombre de transacción'
					autoComplete='on'
				/>
				{errors.name && (
					<p className='text-red-500 text-sm'>
						Ingrese un nombre de transacción válido
					</p>
				)}

				<div className='flex flex-row'>
					<label
						htmlFor='category'
						className='text-sm font-medium text-gray-700 dark:text-white'
					>
						Categoría <InfoTooltip content={CATEGORY_INFO_TOOLTIP_MESSAGE} />
					</label>
				</div>
				<select
					className='w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
					value={category}
					id='category'
					{...register('category', {
						required: true,
						onChange: (e) => {
							setCategory(e.target.value);

							setIsCreditCardCategory(
								e.target.value.includes('Resumen tarjeta')
							);

							setIsBuyCurrenciesCategory(
								e.target.value.includes('Compra divisas')
							);

							setIsCurrencyIncomeCategory(
								e.target.value.includes(INGRESO_DIVISAS_CATEGORY)
							);
						},
					})}
					autoComplete='on'
				>
					<option className='dark:text-white'>Elegí una categoría</option>
					<optgroup label='Gastos'>
						{categories
							?.filter((category) => category.isExpense)
							.map((category) => {
								return (
									<option key={category.id}>
										{isDataFetching ? 'Cargando ...' : category.name}
									</option>
								);
							})}
					</optgroup>
					<optgroup label='Ingresos'>
						{categories
							?.filter((category) => !category.isExpense)
							.map((category) => {
								return (
									<option key={category.id}>
										{isDataFetching ? 'Cargando ...' : category.name}
									</option>
								);
							})}
					</optgroup>
				</select>
				{errors.category && (
					<p className='text-red-500 text-sm'>
						Es obligatorio ingresar una categoría
					</p>
				)}

				{isCreditCardCategory && (
					<div className='ml-3'>
						<label
							htmlFor='selectedExpirationDate'
							className='relative text-sm font-medium text-gray-600 dark:text-zinc-300 block'
						>
							Fecha de Vencimiento
							<input
								className='w-full border border-gray-300 px-3 mt-2 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
								value={selectedExpirationDate}
								type='date'
								id='selectedExpirationDate'
								{...register('selectedExpirationDate', {
									required: true,
									onChange: (e) => {
										setSelectedExpirationDate(e.target.value);
									},
								})}
							/>
							{errors.selectedExpirationDate && (
								<p className='text-red-500 text-sm'>
									Ingrese una fecha de vencimiento válida
								</p>
							)}
						</label>
						<label
							htmlFor='selectedCloseDate'
							className='relative text-sm font-medium text-gray-600 dark:text-zinc-300 block mt-2'
						>
							Fecha de Cierre
							<input
								className='w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
								value={selectedCloseDate}
								type='date'
								id='selectedCloseDate'
								{...register('selectedCloseDate', {
									required: true,
									onChange: (e) => {
										setSelectedCloseDate(e.target.value);
									},
								})}
							/>
							{errors.selectedCloseDate && (
								<p className='text-red-500 text-sm'>
									Ingrese una fecha de cierre válida
								</p>
							)}
						</label>
					</div>
				)}

				{isBuyCurrenciesCategory && (
					<div className='ml-3'>
						<label
							htmlFor='currencyQuantity'
							className='relative text-sm font-medium text-gray-700 dark:text-white block'
						>
							Cantidad
							<input
								className='w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
								type='number'
								value={currencyQuantity}
								id='currencyQuantity'
								{...register('currencyQuantity', {
									required: true,
									pattern: /^\d+(\.\d{1,2})?$/,
									onChange: (e) => {
										setCurrencyQuantity(e.target.value);
									},
								})}
								placeholder='e.g. 1000'
							/>
							{errors.currencyQuantity && (
								<p className='text-red-500 text-sm'>
									Ingrese una cantidad válida
								</p>
							)}
						</label>

						<label
							htmlFor='currencyExchangeRate'
							className='relative text-sm font-medium text-gray-700 dark:text-white block mt-2'
						>
							Cotización
							<input
								className='w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
								value={currencyExchangeRate}
								type='number'
								id='currencyExchangeRate'
								{...register('currencyExchangeRate', {
									required: true,
									pattern: /^\d+(\.\d{1,2})?$/,
									onChange: (e) => {
										setCurrencyExchangeRate(e.target.value);
									},
								})}
								placeholder='e.g. 330'
							/>
							{errors.currencyExchangeRate && (
								<p className='text-red-500 text-sm'>
									Ingrese una tasa de cambio válida
								</p>
							)}
						</label>
					</div>
				)}

				{isCurrencyIncomeCategory && (
					<>
						<label
							htmlFor='currencyQuantity'
							className='relative text-sm font-medium text-gray-700 dark:text-white block'
						>
							Monto divisa
							<input
								className='w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
								type='number'
								value={currencyQuantity}
								id='currencyQuantity'
								{...register('currencyQuantity', {
									required: true,
									pattern: /^\d+(\.\d{1,2})?$/,
									onChange: (e) => {
										setCurrencyQuantity(e.target.value);
									},
								})}
								placeholder='e.g. 1000'
							/>
							{errors.currencyQuantity && (
								<p className='text-red-500 text-sm'>Ingrese un monto valido</p>
							)}
						</label>
					</>
				)}

				{!isCurrencyIncomeCategory && (
					<>
						<label
							htmlFor='amount'
							className=' text-sm font-medium text-gray-700 dark:text-white block'
						>
							Monto
						</label>

						<div className='relative'>
							<svg
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								className={`pointer-events-none shadow-none w-7 h-7 absolute top-5 transform -translate-y-1/2 right-2 ${
									categories
										?.filter((c) => c.isExpense)
										.map((c) => c.name)
										.includes(category)
										? ` text-red-500`
										: `text-green-500`
								} `}
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
								/>
							</svg>
							<input
								className='w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
								value={
									category.includes('Compra divisas')
										? currencyQuantity * currencyExchangeRate
										: amount
								}
								type='number'
								min='0'
								id='amount'
								{...register('amount', {
									required: true,
									pattern: /^\d+(\.\d{1,2})?$/,
									onChange: category.includes('Compra divisas')
										? (e) => {
												setAmount(currencyQuantity * currencyExchangeRate);
										  }
										: (e) => {
												setAmount(e.target.value);
										  },
								})}
								placeholder='e.g. 5000'
							/>
						</div>

						{errors.amount && (
							<p className='text-red-500 text-sm'>
								Ingrese un monto de transacción válido
							</p>
						)}
					</>
				)}

				<label
					htmlFor='date'
					className='block text-sm font-medium text-gray-700 dark:text-white'
				>
					Fecha
				</label>
				<input
					className='w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
					value={selectedDate}
					type='date'
					id='selectedDate'
					{...register('selectedDate', {
						required: true,
						onChange: (e) => {
							setSelectedDate(e.target.value);
						},
					})}
				/>
				{errors.selectedDate && (
					<p className='text-red-500 text-sm '>Ingrese una fecha válida</p>
				)}

				<label
					htmlFor='comment'
					className='block text-sm font-medium text-gray-700 dark:text-white'
				>
					Descripción
				</label>
				<textarea
					className='w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
					value={comment}
					type='text'
					id='comment'
					{...register('comment', {
						required: true,
						pattern: /^[A-Za-z0-9].{2,70}$/,
						onChange: (e) => {
							setComment(e.target.value);
						},
					})}
					placeholder='e.g. Información adicional'
					autoComplete='on'
				/>
				{errors.comment && (
					<p className='text-red-500 text-sm'>
						Ingrese una descripción de transacción válida
					</p>
				)}

				<button
					type='submit'
					className='w-full py-3  border border-transparent shadow-sm bg-primary hover:opacity-95 font-Roboto font-medium text-white text-center text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md '
				>
					{edit ? 'Guardar' : 'Añadir'}
				</button>
			</form>
		</>
	);
};

export default TransactionForm;
