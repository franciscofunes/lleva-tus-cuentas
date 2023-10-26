import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

import { useDispatch, useSelector } from 'react-redux';

import { Link } from 'react-router-dom';

import { FaTimes } from 'react-icons/fa';
import { getPaymentDataAction } from '../actionCreators/databaseActions';
import UserSubscribed from '../imgs/userSubscribed.svg';

const SubscriptionCard = () => {
	const isDevelopment = process.env.NODE_ENV === 'development';
	const dispatch = useDispatch();
	const iframeSrc = isDevelopment
		? 'http://localhost:3006/'
		: 'https://ltc-subscripcion.vercel.app/';

	// Use the paymentData from the Redux store
	const paymentData = useSelector((state) => state.database.paymentData);
	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);

	const successVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0 },
	};

	// Function to calculate the remaining days of the subscription
	const calculateRemainingDays = () => {
		if (paymentData) {
			const currentDate = new Date();
			const expirationDate = paymentData.subscriptionExpirationDate.toDate();
			const timeDifference = expirationDate - currentDate;
			const remainingDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
			return remainingDays;
		}

		return 0;
	};

	const convertFirestoreTimestamp = (timestamp) => {
		if (!timestamp) return '-';

		const date = timestamp.toDate();
		return date.toLocaleDateString(); // Format it as needed
	};

	useEffect(() => {
		if (user) {
			dispatch(getPaymentDataAction(user.uid));
		}
	}, [dispatch, user]);

	// if (user === null) return <Navigate to='/' />;

	if (isFetching) {
		return (
			<div className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-70 z-50'>
				<div className='w-[50%] h-10 flex items-center justify-center'>
					<div
						style={{ width: '60px', height: '60px' }}
						className='animate-spin'
					>
						<div className='h-full w-full border-4 border-t-indigo-900 border-b-indigo-700 border-l-gray-800 border-r-gray-800 rounded-[50%]'></div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='flex items-center justify-center mt-2 p-2 dark:bg-gray-900'>
			{user && paymentData ? (
				// User is logged in and subscribed, show the card with remaining days
				<div className='max-w-3xl w-full p-4 bg-white dark:bg-gray-800 rounded-md shadow-md flex flex-col mt-4 sm:flex-row'>
					<div className='sm:w-1/2 p-4 flex flex-col'>
						<div className='flex items-center'>
							<h2 className='text-green-500 text-2xl font-semibold mr-2'>
								¡Usted ya está subscripto!
							</h2>
						</div>
						<ul className='list-inside list-disc text-lg dark:text-indigo-400 mb-2 mt-2'>
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
						{calculateRemainingDays() <= 0 ? (
							<p className='text-red-500'>
								Tu suscripción ha expirado.
								<FaTimes className='text-red-500 inline ml-1' />{' '}
								{/* Add the red cross icon */}
							</p>
						) : (
							<p className='text dark:text-yellow-400'>
								Tiene {calculateRemainingDays()} días restantes en su
								subscripción.
							</p>
						)}
					</div>
					<div className='sm:w-1/2 p-4 flex items-center justify-center'>
						<img
							src={UserSubscribed}
							alt='User subscribed'
							className='w-48 h-48 sm:w-64 sm-h-64'
						/>
					</div>
				</div>
			) : (
				<>
					{user ? (
						<iframe
							src={iframeSrc}
							title='Subscription Website'
							className='w-full'
							style={{ height: '600px' }}
						/>
					) : (
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
										Disculpe las molestias ocasionadas. Para acceder a esta
										funcionalidad, por favor regístrese o inicie sesión con su
										cuenta de Gmail.
									</p>
									<Link to='/registrarse'>
										<button className='mt-4 text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded'>
											Ir a la página de registro
										</button>
									</Link>
								</div>
								<div className='sm:w-1/2 p-4 flex items-center justify-center'>
									{/* You can add an image here if needed */}
								</div>
							</motion.div>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default SubscriptionCard;
