import React from 'react';

const SubscriptionCard = () => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	const iframeSrc = isDevelopment
		? 'http://localhost:3006/'
		: 'https://ltc-subscripcion.vercel.app/';
	return (
		<div className='flex items-center justify-center flex-col mt-10 lg:mt-0 dark:bg-gray-900'>
			<iframe
				src={iframeSrc}
				title='Subscription Website'
				className='w-full'
				style={{ height: '600px' }}
			/>
		</div>
	);
};

export default SubscriptionCard;
