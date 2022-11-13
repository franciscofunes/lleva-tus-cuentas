import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import {
	getDataAction,
	storeDataAction,
	updateDataAction,
} from '../actionCreators/databaseActions';
import Card from '../components/Card';
import LitaModal from '../components/LitaModal';
import bars from '../imgs/bars.svg';
import { currencyFormater } from '../shared/utils/currencyFormater';

function Dashboard() {
	const dispatch = useDispatch();

	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);
	const isDataFetching = useSelector((state) => state.database.isDataFetching);
	const docs = useSelector((state) => state.database.docs);

	const [income, setIncome] = useState(0);
	const [expense, setExpense] = useState(0);
	const [total, setTotal] = useState(0);
	const [edit, setEdit] = useState(false);
	const [expenseId, setExpenseId] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [comment, setComment] = useState('');
	const [category, setCategory] = useState('');
	const [selectedDate, setSelectedDate] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm();

	useEffect(() => {
		if (user) {
			dispatch(getDataAction(user.uid));
		}
	}, [user]);

	useEffect(() => {
		setExpense(0);
		setIncome(0);

		if (docs) {
			const amounts = docs.map((doc) => parseInt(doc.amount));

			setTotal(amounts.reduce((acc, item) => (acc += item), 0).toFixed(2));

			setIncome(
				amounts
					.filter((item) => item > 0)
					.reduce((acc, item) => acc + item, 0)
					.toFixed(2)
			);

			setExpense(
				amounts
					.filter((item) => item < 0)
					.reduce((acc, item) => acc + item, 0) * -(1).toFixed(2)
			);
		}
	}, [docs]);

	if (isFetching)
		return (
			<div className='h-screen flex flex-col items-center justify-center'>
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
	};

	const handleFloatingButtonClick = () => {
		setShowModal(true);
	};

	const onSubmit = (e) => {
		if (!edit) {
			dispatch(
				storeDataAction({
					userId: user.uid,
					name,
					amount,
					comment,
					category,
					selectedDate,
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

			dispatch(getDataAction(user.uid));
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
				className='container lg:px-6   max-w-full grid lg:grid-cols-3  overflow-y-auto lg:overflow-hidden dark:bg-gray-900'
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
							className='flex justify-between  max-w-full items-center mb-10 '
						>
							<div className='flex flex-col justify-center items-center  '>
								<h1 className='font-semibold text-2xl uppercase dark:text-zinc-100'>
									Ingresos
								</h1>
								<p className='text-green-500 font-medium'>{`${currencyFormater(
									income
								)}`}</p>
							</div>
							<div className='flex flex-col justify-center items-center '>
								<h1 className='font-semibold text-2xl uppercase dark:text-zinc-100'>
									Gastos
								</h1>
								<p className='text-red-500 font-medium'>{`${currencyFormater(
									expense
								)}`}</p>
							</div>
						</div>
						<div>
							<h2 className='text-2xl font-semibold text-center dark:text-zinc-100 '>
								{currencyFormater(total)}
							</h2>
							<p className='text-gray-400 text-center'>Balance Total</p>
						</div>
					</motion.div>
					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ duration: 0.7, type: 'tween' }}
						id='add-transaction'
						className='lg:w-3/4 w-full lg:mb-0 mb-8 bg-white p-8 border rounded-md shadow-md dark:bg-slate-800 dark:border-indigo-500'
					>
						<form className='mb-0 space-y-6' onSubmit={handleSubmit(onSubmit)}>
							<div>
								<h1 className='font-Nunito font-semibold text-xl mb-3 dark:text-zinc-100 underline'>
									{edit ? 'Editar transacción' : 'Nueva transacción'}
								</h1>

								<div className='mb-2'>
									<label
										htmlFor='name'
										className='block text-sm font-medium text-gray-700 dark:text-white'
									>
										Nombre transacción
									</label>
									<input
										className='mt-1 w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
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
										<p className='text-red-500 text-sm mb-1'>
											Ingrese un nombre de transacción válido
										</p>
									)}
								</div>

								<div className='mb-2'>
									<label
										htmlFor='category'
										className='block text-sm font-medium text-gray-700 dark:text-white'
									>
										Categoría
									</label>
									<select
										className='mt-1 w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
										value={category}
										type='text'
										id='comment'
										{...register('category', {
											required: true,
											onChange: (e) => {
												setCategory(e.target.value);
											},
										})}
										placeholder='Ingrese nombre de transacción'
										autoComplete='on'
									>
										<option
											className='dark:text-white'
											defaultValue={'categoriaDefault'}
										>
											Elegí una categoría
										</option>
										<optgroup label='Gastos'>
											<option>Alimentación</option>
											<option>Salud</option>
											<option>Tarjeta de crédito</option>
											<option>Ocio</option>
											<option>Transporte</option>
											<option>Educación</option>
											<option>Librería</option>
											<option>Varios</option>
										</optgroup>
										<optgroup label='Ingresos'>
											<option>Sueldo</option>
											<option>Bono</option>
											<option>Honorarios</option>
											<option>Varios</option>
										</optgroup>
									</select>
									{errors.category && (
										<p className='text-red-500 text-sm mb-1'>
											Es obligatorio ingresar una categoría
										</p>
									)}
								</div>

								<div className='mb-2'>
									<label
										htmlFor='amount'
										className='block text-sm font-medium text-gray-700 dark:text-white'
									>
										Monto{' '}
										<small className='font-bold text-purple-600 text-xs italic '>
											(usa el signo " - " para agregar gastos)
										</small>
									</label>
									<input
										className='mt-1 w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
										value={amount}
										type='number'
										min='-99999999999'
										step='0.01'
										id='amount'
										{...register('amount', {
											required: true,
											pattern: /^-?\d+(\.\d{1,2})?$/,
											onChange: (e) => {
												setAmount(e.target.value);
											},
										})}
										placeholder='e.g. "5000" (Ingreso) o "-3000" (Gasto)'
									/>
									{errors.amount && (
										<p className='text-red-500 text-sm mb-1'>
											Ingrese un monto de transacción válido
										</p>
									)}
								</div>

								<div className='mb-2'>
									<label
										htmlFor='name'
										className='block text-sm font-medium text-gray-700 dark:text-white'
									>
										Fecha
									</label>
									<input
										className='mt-1 w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
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
										<p className='text-red-500 text-sm mb-1'>
											Ingrese una fecha válida
										</p>
									)}
								</div>

								<div className='mb-2'>
									<label
										htmlFor='name'
										className='block text-sm font-medium text-gray-700 dark:text-white'
									>
										Descripción
									</label>
									<textarea
										className='mt-1 w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white'
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
										<p className='text-red-500 text-sm mb-1'>
											Ingrese una descripción de transacción válida
										</p>
									)}
								</div>
							</div>
							<div>
								<button
									type='submit'
									className='w-full flex justify-center py-3 px-4 border border-transparent shadow-sm bg-primary hover:opacity-95 font-Roboto font-medium text-white text-center text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md '
								>
									{edit ? 'Guardar' : 'Añadir'}
								</button>
								{edit && (
									<button
										className=' w-full flex justify-center py-3 px-4  border-transparent shadow-sm bg-red-600 hover:opacity-95 font-Roboto font-medium text-white text-center mt-2 text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md '
										onClick={handleCancelEdit}
									>
										Cancelar
									</button>
								)}
							</div>
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
						<h1 className='font-Nunito font-bold text-3xl mb-2 mt dark:text-zinc-100'>
							Transacciones 📕
						</h1>
						{isDataFetching && (
							<div className='flex'>
								<p className='text-zinc-500 font-semiboldt text-base'>
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
									setExpense={setExpense}
									setIncome={setIncome}
									setName={setName}
									setAmount={setAmount}
									setComment={setComment}
									setCategory={setCategory}
									setSelectedDate={setSelectedDate}
									setEdit={setEdit}
									setExpenseId={setExpenseId}
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
