import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import 'react-loading-skeleton/dist/skeleton.css';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import 'tippy.js/dist/tippy.css';
import {
	getCategoriesDataAction,
	getDataAction,
} from '../actionCreators/databaseActions';
import BarChartWrapper from '../components/BarChartWrapper';
import Card from '../components/Card';
import ExpenseFilter from '../components/ExpenseFilter';
import FloatingMenu from '../components/FloatingMenu';
import GenericModal from '../components/GenericModal';
import LitaModal from '../components/LitaModal';
import SearchBar from '../components/SearchBar';
import TransactionForm from '../components/TransactionForm';
import bars from '../imgs/bars.svg';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';
import {
	currencyFormater,
	currencyGenericFormater,
} from '../shared/utils/currencyFormater';
import LitaAssistant from '../components/LitaAssistant';
import wavesFooter from '../imgs/waves.svg';

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

	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (user) {
			dispatch(getCategoriesDataAction());
		}
	}, [user, dispatch]);

	useEffect(() => {
		if (user) {
			dispatch(getDataAction(user.uid));
		}
	}, [user, dispatch]);

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
						doc.category.includes(INGRESO_DIVISAS_CATEGORY)
				)
				.map((doc) => {
					const currencyQuantity = parseFloat(doc?.currencyQuantity);
					return isNaN(currencyQuantity) ? 0 : currencyQuantity;
				});

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

	if (user === null) return <Navigate to='/' />;

	if (isFetching)
		return (
			<div className='h-screen flex flex-col items-center justify-center align-center'>
				<img className='h-20 w-20' src={bars} alt='loader' />
			</div>
		);

	const handleFloatingButtonClick = () => {
		setShowModal(true);
	};

	const openModal = () => {
		setIsOpen(true);
	};

	const closeModal = () => {
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
	};

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
						className='container  bg-white p-10 lg:w-3/4 w-full border rounded-md shadow-md mb-6 mt-6 font-Nunito flex flex-col  dark:bg-slate-800 dark:border-indigo-500'
					>
						<div
							id='top-info'
							className='flex gap-x-2 justify-between max-w-full items-center mb-5'
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

						<div className='flex flex-col gap-x-1 mt-2 mb-2'>
							<p className='text-gray-400 text-center text-lg'>Balance</p>

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
						<ExpenseFilter />
					</motion.div>

					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ duration: 0.7, type: 'tween' }}
						id='left'
						className='container  bg-white p-10 lg:w-3/4 w-full border rounded-md shadow-md mb-6 font-Nunito flex flex-col dark:bg-slate-800 dark:border-indigo-500 items-center' // Added "items-center" class
					>
						{isDataFetching ? (
							<div className='flex justify-center items-center'>
								<img className='ml-2 h-5 w-5' src={bars} alt='loader' />
							</div>
						) : (
							docs && (
								<BarChartWrapper chartData={docs} categories={categories} />
							)
						)}
					</motion.div>
				</div>

				<motion.div
					animate={{ opacity: 1 }}
					initial={{ opacity: 0 }}
					transition={{ duration: 0.7, type: 'tween' }}
					id='right'
					className='lg:col-span-2 container bg-white flex flex-col justify-start lg:py-5 lg:px-10 px-3 py-5 lg:mt-11 shadow-md mx-auto items-stretch w-full border rounded-md dark:bg-slate-800 dark:border-indigo-500 h-screen lg:h-auto mb-10'
				>
					<div>
						<h1 className='font-Nunito font-bold text-3xl mb-2 ml-1 dark:text-zinc-100'>
							Transacciones 📕
						</h1>
						<SearchBar />

						{isDataFetching ? (
							<div className='flex'>
								<p className='text-zinc-500 font-semiboldt ml-2 text-base'>
									Estamos cargando sus transacciones
								</p>
								<img className='mt-1 ml-2 h-5 w-5' src={bars} alt='loader' />
							</div>
						) : (
							!docs ||
							(docs.length === 0 && (
								<div className='flex'>
									<p className='text-zinc-500 font-semibold text-lg'>
										Bienvenido, aún no registraste ninguna transacción. ¿Qué
										estás esperando? ¡Empezá a controlar tus gastos! 💪
									</p>
								</div>
							))
						)}

						{docs?.map((doc) => {
							return (
								<div key={doc.id}>
									<Card
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
										openModal={openModal}
									/>
								</div>
							);
						})}
					</div>
				</motion.div>

				<div className='absolute bottom-0 left-0 w-full'>
					<img src={wavesFooter} alt='purple waves footer' className='w-full' />
				</div>
			</motion.div>

			<motion.div
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ duration: 0.2, type: 'tween' }}
			>
				<FloatingMenu
					openTransactionModal={openModal}
					openLitaModal={handleFloatingButtonClick}
					isModalOpen={isOpen || showModal}
				/>

				{isOpen && (
					<GenericModal
						component={TransactionForm}
						name={name}
						amount={amount}
						edit={edit}
						comment={comment}
						category={category}
						selectedDate={selectedDate}
						selectedExpirationDate={selectedExpirationDate}
						selectedCloseDate={selectedCloseDate}
						currencyExchangeRate={currencyExchangeRate}
						currencyQuantity={currencyQuantity}
						isCreditCardCategory={isCreditCardCategory}
						isBuyCurrenciesCategory={isBuyCurrenciesCategory}
						isCurrencyIncomeCategory={isCurrencyIncomeCategory}
						expenseId={expenseId}
						categories={categories}
						closeModal={closeModal}
						show={isOpen}
						setEdit={setEdit}
						setExpense={setExpense}
						setExpenseId={setExpenseId}
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
						setIsOpen={setIsOpen}
					/>
				)}

				{showModal && (
					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ duration: 0.5, type: 'tween' }}
					>
						<LitaAssistant isOpen={showModal} setIsOpen={setShowModal} />
					</motion.div>
				)}
			</motion.div>
		</>
	);
}

export default Dashboard;
