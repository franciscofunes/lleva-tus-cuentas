import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import UserSubscribed from '../imgs/userSubscribed.svg';
import { getPaymentDataAction } from '../actionCreators/databaseActions';

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
		console.log(paymentData);
		return 0; // Default to 0 days if paymentData is not available
	};

	useEffect(() => {
		if (user) {
			dispatch(getPaymentDataAction(user.uid));
		}
	}, [dispatch, user]);

	return (
		<div className='flex items-center justify-center mt-2 p-4 dark:bg-gray-900'>
			{user && paymentData ? (
				// User is logged in and subscribed, show the card with remaining days
				<div className='max-w-3xl w-full p-4 bg-white dark:bg-gray-800 rounded-md shadow-md flex flex-col mt-4 sm:flex-row'>
					<div className='sm:w-1/2 p-4 flex flex-col'>
						<div className='flex items-center'>
							<h2 className='text-green-500 text-2xl font-semibold mr-2'>
								¡Usted ya está suscrito!
							</h2>
						</div>
						<p className='text-lg dark:text-indigo-400'>
							Usted tiene {calculateRemainingDays()} días restantes en su
							suscripción.
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
