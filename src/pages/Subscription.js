import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { Navigate } from 'react-router-dom';
import { getPaymentDataAction } from '../actionCreators/databaseActions';
import UserSubscribed from '../imgs/userSubscribed.svg';
import { FaTimes } from 'react-icons/fa';

const SubscriptionCard = () => {
	const isDevelopment = process.env.NODE_ENV === 'development';
	const dispatch = useDispatch();
	const iframeSrc = isDevelopment
		? 'http://localhost:3006/'
		: 'https://ltc-subscripcion.vercel.app/';

	// Use the paymentData from the Redux store
	const paymentData = useSelector((state) => state.database.paymentData);
	const user = useSelector((state) => state.auth.user);

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

	if (user === null) return <Navigate to='/' />;

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
						<p className='text dark:text-yellow-400'>
							Tiene {calculateRemainingDays()} días restantes en su
							subscripción.
						</p>
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
					<iframe
						src={iframeSrc}
						title='Subscription Website'
						className='w-full'
						style={{ height: '600px' }}
					/>
				</>
			)}
		</div>
	);
};

export default SubscriptionCard;
