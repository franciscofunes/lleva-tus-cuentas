import { motion } from 'framer-motion';
import JsPDF from 'jspdf';
import React, { useEffect, useState } from 'react';
import { FaFilePdf } from 'react-icons/fa';
import { RiCheckFill } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
	getPaymentDataAction,
	storeSubscriptionAction,
} from '../actionCreators/databaseActions';
import AccessDenied from '../imgs/accessDenied.svg';
import PaymentSucceed from '../imgs/paymentSucceed.svg';

const PaymentSuccess = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const user = useSelector((state) => state.auth.user);
	const [isAuthorized, setAuthorize] = useState(true);
	const dispatch = useDispatch();
	const paymentData = useSelector((state) => state.database.paymentData);
	const isPaymentDataLoading = useSelector(
		(state) => state.database.isPaymentDataLoading
	);

	const [isPaymentDataLoaded, setPaymentDataLoaded] = useState(false);

	const navigate = useNavigate();

	const isFetching = useSelector((state) => state.auth.isFetching);
	let circleCommonClasses = 'h-2 w-2 bg-purple rounded-full';

	const successVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0 },
	};

	const generatePDF = () => {
		const report = new JsPDF();
		report.setFont('Lato-Regular', 'normal');

		report.text('Lleva tus cuentas', 20, 20).setFontSize(25);

		report.text('Pago Exitoso', 20, 30).setFontSize(20);
		report.text('Muchas gracias por su confianza', 20, 120).setFontSize(10);

		const listItems = [
			`------------------------------------------------------`,
			`* ID de Pago: ${paymentData?.payment_id || '-'}`,
			`* Estado: ${paymentData?.collection_status || '-'}`,
			`* ID de Pedido: ${paymentData?.merchant_order_id || '-'}`,
			`* Tipo de Pago: ${paymentData?.payment_type || '-'}`,
			`* Fec. Venc.: ${convertFirestoreTimestamp(
				paymentData?.subscriptionExpirationDate
			)}`,
			`------------------------------------------------------`,
		];

		let verticalPosition = 40;

		listItems.forEach((item) => {
			report.text(item, 20, verticalPosition).setFontSize(15);
			verticalPosition += 10;
		});

		report.save('pago_exitoso.pdf');
	};

	const convertFirestoreTimestamp = (timestamp) => {
		if (!timestamp) return '-';

		const date = timestamp.toDate();
		return date.toLocaleDateString(); // Format it as needed
	};

	useEffect(() => {
		if (
			!searchParams.get('payment_id') ||
			!searchParams.get('collection_status') ||
			!searchParams.get('merchant_order_id') ||
			!searchParams.get('payment_type')
		) {
			let path = `/subscripcion`;
			navigate(path);
			return;
		}

		if (user === null) {
			setAuthorize(false);
		} else {
			setAuthorize(true);

			dispatch(
				storeSubscriptionAction({
					userId: user.uid,
					payment_id: searchParams.get('payment_id'),
					collection_status: searchParams.get('collection_status'),
					merchant_order_id: searchParams.get('merchant_order_id'),
					payment_type: searchParams.get('payment_type'),
				})
			)
				.then(() => {
					// Handle the success case
					dispatch(getPaymentDataAction(user.uid));
					setPaymentDataLoaded(true);
				})
				.catch((err) => {
					// Handle the error case
					if (err.message === 'User already has a subscription') {
						// Handle the case where the user already has a subscription
						// This can be done by showing a message or other appropriate actions.
					} else {
						console.error(err.message);
					}
				});
		}
	}, [user, dispatch]);

	if (isFetching) {
		return (
			<div className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-70 z-50'>
				<div className='flex'>
					<div className={`${circleCommonClasses} mr-1 animate-bounce`}></div>
					<div
						className={`${circleCommonClasses} mr-1 animate-bounce200`}
					></div>
					<div className={`${circleCommonClasses} animate-bounce400`}></div>
				</div>
			</div>
		);
	}

	if (!isAuthorized) {
		return (
			<div className='flex items-center justify-center mt-10 p-4 dark:bg-gray-900'>
				<motion.div
					initial='hidden'
					animate='visible'
					variants={successVariants}
					className='max-w-3xl w-full p-4 bg-white dark:bg-gray-800 rounded-md shadow-md flex flex-col mt-4 sm:flex-row'
				>
					<div className='sm:w-1/2 p-4 flex flex-col'>
						<div className='flex items-center'>
							<h2 className='text-red-500 text-2xl font-semibold mr-2'>
								Sitio no autorizado ⛔
							</h2>
						</div>
						<p className='text-lg dark:text-indigo-400'>
							Disculpe las molestias ocasionadas
						</p>
						<Link to='/'>
							<button className='mt-4 text-white bg-indigo-500 hover-bg-indigo-600 px-4 py-2 rounded'>
								Volver
							</button>
						</Link>
					</div>
					<div className='sm:w-1/2 p-4 flex items-center justify-center'>
						<img
							src={AccessDenied}
							alt='Access Denied'
							className='w-48 h-48 sm:w-64 sm-h-64'
						/>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className='flex items-center justify-center mt-10 p-4 dark:bg-gray-900'>
			<motion.div
				initial='hidden'
				animate='visible'
				variants={successVariants}
				className='max-w-3xl w-full p-4 bg-white dark:bg-gray-800 rounded-md shadow-md flex flex-col mt-4 sm:flex-row'
			>
				<div className='sm:w-1/2 p-4 flex flex-col'>
					<div className='flex items-center'>
						<h2 className='text-green-500 text-2xl font-semibold mr-2'>
							Pago Exitoso
						</h2>
						<RiCheckFill className='text-green-500 text-2xl' />
					</div>
					{isPaymentDataLoaded ? (
						<ul className='list-inside list-disc text-lg dark:text-indigo-400'>
							<li>ID de Pago: {paymentData?.payment_id || '-'}</li>
							<li>Estado: {paymentData?.collection_status || '-'}</li>
							<li>ID de Pedido: {paymentData?.merchant_order_id || '-'}</li>
							<li>Tipo de Pago: {paymentData?.payment_type || '-'}</li>
							<li>
								Fec. Venc.:{' '}
								{convertFirestoreTimestamp(
									paymentData?.subscriptionExpirationDate
								)}
							</li>
						</ul>
					) : (
						<p className='text-lg dark:text-indigo-400'>
							Cargando información de pago...
						</p>
					)}
					<button
						onClick={generatePDF}
						className={`bg-purple-500 hover:bg-purple-700 mt-4 text-white font-bold py-2 px-4 rounded 
             ${
								!paymentData ? 'opacity-60 pointer-events-none bg-gray-300' : ''
							}`}
						style={{
							display: 'flex',
							alignItems: 'center',
							width: 'fit-content',
						}}
						disabled={!paymentData}
					>
						<FaFilePdf size={20} className='mr-2' />
						Descargar PDF
					</button>
				</div>
				<div className='sm:w-1/2 p-4 flex items-center justify-center'>
					<img
						src={PaymentSucceed}
						alt='Payment Succeed'
						className='w-48 h-48 sm:w-64 sm-h-64'
					/>
				</div>
			</motion.div>
		</div>
	);
};

export default PaymentSuccess;
