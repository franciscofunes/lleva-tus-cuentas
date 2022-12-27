import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import 'react-loading-skeleton/dist/skeleton.css';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import 'tippy.js/dist/tippy.css'; // optional
import {
	getCaterogiesDataAction,
	getDataAction,
	storeDataAction,
	updateDataAction,
} from '../actionCreators/databaseActions';
import Card from '../components/Card';
import InfoTooltip from '../components/InfoTooltip';
import LitaModal from '../components/LitaModal';
import bars from '../imgs/bars.svg';
import { CATEGORY_INFO_TOOLTIP_MESSAGE } from '../shared/constants/tooltip-messages.const';
import {
	currencyFormater,
	currencyGenericFormater,
} from '../shared/utils/currencyFormater';

function Dashboard() {
	const dispatch = useDispatch();
	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);
	const isDataFetching = useSelector((state) => state.database.isDataFetching);
	const docs = useSelector((state) => state.database.docs);
	const categories = useSelector((state) => state.database.categories);

	const [income, setIncome] = useState(0);
	const [currencyIncome, setCurrencyIncome] = useState(0);
	const [expense, setExpense] = useState(0);
	const [total, setTotal] = useState(0);

	const [edit, setEdit] = useState(false);

	const [showModal, setShowModal] = useState(false);

	const [expenseId, setExpenseId] = useState('');
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [comment, setComment] = useState('');
	const [category, setCategory] = useState('');
	const [selectedDate, setSelectedDate] = useState('');

	const [isCreditCardCategory, setIsCreditCardCategory] = useState(false);
	const [selectedExpirationDate, setSelectedExpirationDate] = useState('');
	const [selectedCloseDate, setSelectedCloseDate] = useState('');

	const [isBuyCurrenciesCategory, setIsBuyCurrenciesCategory] = useState(false);
	const [currencyQuantity, setCurrencyQuantity] = useState();
	const [currencyExchangeRate, setCurrencyExchangeRate] = useState();

	const [isCurrencyIncomeCategory, setIsCurrencyIncomeCategory] =
		useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm();

	useEffect(() => {
		if (user) {
			dispatch(getCaterogiesDataAction());
		}
	}, [user]);

	useEffect(() => {
		if (user) {
			dispatch(getDataAction(user.uid));
		}
	}, [user]);

	useEffect(() => {
		setExpense(0);
		setIncome(0);

		if (docs && categories) {
			const expensesCategories = categories
				?.filter((category) => category.isExpense)
				?.map((category) => category.name);

			const expenses = docs
				.filter((doc) => expensesCategories?.includes(doc?.category))
				.map((doc) => !isNaN(doc?.amount) && parseFloat(doc?.amount));

			const incomes = docs
				.filter((doc) => !expensesCategories?.includes(doc?.category))
				.map((doc) => !isNaN(doc?.amount) && parseFloat(doc?.amount));

			const currencyIncome = docs
				.filter(
					(doc) =>
						doc.category.includes('Compra divisas') ||
						doc.category.includes('Ingreso divisas')
				)
				.map(
					(doc) =>
						!isNaN(doc?.currencyQuantity) && parseFloat(doc?.currencyQuantity)
				);

			setExpense(
				expenses?.reduce((acc, item) => acc + item, 0) * -(1).toFixed(2)
			);

			setIncome(incomes?.reduce((acc, item) => acc + item, 0).toFixed(2));

			setCurrencyIncome(
				currencyIncome?.reduce((acc, item) => acc + item, 0).toFixed(2)
			);

			setTotal(
				incomes?.reduce((acc, item) => acc + item, 0).toFixed(2) -
					expenses?.reduce((acc, item) => acc + item, 0).toFixed(2)
			);
		}
	}, [docs, categories]);

	if (isFetching)
		return (
			<div className='h-screen flex flex-col items-center justify-center align-center'>
				<img className='h-20 w-20' src={bars} alt='loader' />
			</div>
		);

	const handleCancelEdit = () => {
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
	};

	const handleFloatingButtonClick = () => {
		setShowModal(true);
	};

	const onSubmit = (e) => {
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
		}
	};

	if (user === null) return <Navigate to='/' />;

	return (
		<>
			<motion.div
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ duration: 1 }}
				id='dashboard'
				className='container lg:px-6 max-w-full grid lg:grid-cols-3 overflow-y-auto lg:overflow-hidden dark:bg-gray-900'
			>
				<div
					id='left'
					className='container flex lg:py-5 mx-auto w-full flex-col justify-between items-center'
				>
					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ duration: 0.7, type: 'tween' }}
						id='info'
						className='container bg-white p-10 lg:w-3/4 w-full border rounded-md shadow-md mb-6 mt-6 font-Nunito flex flex-col dark:bg-slate-800 dark:border-indigo-500'
					>
						<div
							id='top-info'
							className='flex flex-gol gap-x-2 justify-between max-w-full items-center mb-5'
						>
							<div className='flex flex-col justify-center items-center'>
								<h1 className='font-semibold text-2xl uppercase dark:text-zinc-100'>
									Ingresos
								</h1>

								{isDataFetching ? (
									<img className='ml-2 h-6 w-6' src={bars} alt='loader' />
								) : (
									<p className='text-green-500 font-medium'>{`${currencyFormater(
										income
									)}`}</p>
								)}
							</div>

							<div className='flex flex-col justify-center items-center'>
								<h1 className='font-semibold text-2xl uppercase dark:text-zinc-100'>
									Gastos
								</h1>

								{isDataFetching ? (
									<img className='ml-2 h-6 w-6' src={bars} alt='loader' />
								) : (
									<p className='text-red-500 font-medium'>{`${currencyFormater(
										expense
									)}`}</p>
								)}
							</div>
						</div>

						<div className='flex flex-col justify-center items-center mb-2'>
							<h1 className='font-semibold text-2xl uppercase dark:text-zinc-100'>
								Inversión
							</h1>

							{isDataFetching ? (
								<img className='ml-2 h-6 w-6' src={bars} alt='loader' />
							) : (
								<p className='text-blue-500 font-medium'>{`${currencyGenericFormater(
									'USD',
									currencyIncome,
									'en-US',
									'USD'
								)}`}</p>
							)}
						</div>

						<div className='flex flex-col gap-x-1 mt-2'>
							<p className='text-gray-400 text-center text-lg'>
								Balance Total{' '}
							</p>

							<div className='flex flex-col gap-x-2 space-y-1 justify-center items-center'>
								{isDataFetching ? (
									<img className='ml-2 h-6 w-6' src={bars} alt='loader' />
								) : (
									<h2
										className={`text-2xl font-semibold text-center ${
											total < 0 ? `text-red-500` : `text-green-500`
										}`}
									>
										{currencyFormater(total)}
									</h2>
								)}
							</div>
						</div>
					</motion.div>
					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ duration: 0.7, type: 'tween' }}
						id='add-transaction'
						className='lg:w-3/4 w-full lg:mb-0 mb-8 bg-white p-8 border rounded-md shadow-md dark:bg-slate-800 dark:border-indigo-500'
					>
						<form
							className='mb-0 flex flex-col gap-y-2 space-y-1'
							onSubmit={handleSubmit(onSubmit)}
						>
							<h1 className='font-Nunito font-semibold text-xl mb-3 dark:text-purple-500 underline'>
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
								placeholder='Ingrese nombre de transacción'
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
									Categoría{' '}
									<InfoTooltip content={CATEGORY_INFO_TOOLTIP_MESSAGE} />
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
											e.target.value.includes('Ingreso divisas')
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
											<p className='text-red-500 text-sm'>
												Ingrese un monto valido
											</p>
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
															setAmount(
																currencyQuantity * currencyExchangeRate
															);
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
								<p className='text-red-500 text-sm '>
									Ingrese una fecha válida
								</p>
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
							{edit && (
								<button
									className='w-full py-3 px-4  border-transparent shadow-sm bg-red-600 hover:opacity-95 font-Roboto font-medium text-white text-center mt-2 text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md '
									onClick={handleCancelEdit}
								>
									Cancelar
								</button>
							)}
						</form>
					</motion.div>
				</div>
				<motion.div
					animate={{ opacity: 1 }}
					initial={{ opacity: 0 }}
					transition={{ duration: 0.7, type: 'tween' }}
					id='right'
					className='lg:col-span-2 container bg-white flex flex-col justify-start lg:py-5 lg:px-10 px-3 py-5 lg:mt-11 shadow-md mx-auto items-stretch w-full border rounded-md dark:bg-slate-800 dark:border-indigo-500'
				>
					<div>
						<h1 className='font-Nunito font-bold text-3xl mb-2 ml-1 dark:text-zinc-100'>
							Transacciones 📕
						</h1>
						{isDataFetching && (
							<div className='flex'>
								<p className='text-zinc-500 font-semiboldt ml-2 text-base'>
									Estamos cargando sus transacciones
								</p>
								<img className='mt-1 ml-2 h-5 w-5' src={bars} alt='loader' />
							</div>
						)}

						{!isDataFetching && !docs?.length && (
							<div className='flex'>
								<p className='text-zinc-500 font-semibold text-lg'>
									Bienvenido , aún no registraste ninguna transacción, ¿Qué
									estás esperando? Empeza a controlar tus gastos 💪
								</p>
							</div>
						)}

						{docs?.map((doc) => {
							return (
								<Card
									key={doc.id}
									id={doc.id}
									name={doc.expenseName}
									amount={doc.amount}
									date={doc.date}
									comment={doc.comment}
									category={doc.category}
									selectedDate={doc.selectedDate}
									selectedExpirationDate={doc.selectedExpirationDate}
									selectedCloseDate={doc.selectedCloseDate}
									currencyExchangeRate={doc.currencyExchangeRate}
									currencyQuantity={doc.currencyQuantity}
									setExpense={setExpense}
									setIncome={setIncome}
									setName={setName}
									setAmount={setAmount}
									setComment={setComment}
									setCategory={setCategory}
									setIsCreditCardCategory={setIsCreditCardCategory}
									setIsBuyCurrenciesCategory={setIsBuyCurrenciesCategory}
									setIsCurrencyIncomeCategory={setIsCurrencyIncomeCategory}
									setSelectedDate={setSelectedDate}
									setSelectedExpirationDate={setSelectedExpirationDate}
									setSelectedCloseDate={setSelectedCloseDate}
									setCurrencyQuantity={setCurrencyQuantity}
									setCurrencyExchangeRate={setCurrencyExchangeRate}
									setEdit={setEdit}
									setExpenseId={setExpenseId}
									categories={categories}
								/>
							);
						})}
					</div>
				</motion.div>
			</motion.div>
			<motion.div
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ duration: 0.7, type: 'tween' }}
			>
				<button
					onClick={handleFloatingButtonClick}
					className='fixed z-90 bottom-10 right-8 lg:right-12 bg-primary w-20 h-20 rounded-full drop-shadow-lg flex justify-center items-center text-white text-4xl hover:bg-primary-200 hover:drop-shadow-2xl hover:animate-none animate-bounce focus:animate-none'
				>
					💰
				</button>
			</motion.div>

			{showModal && (
				<LitaModal showModal={showModal} setShowModal={setShowModal} />
			)}
		</>
	);
}

export default Dashboard;
