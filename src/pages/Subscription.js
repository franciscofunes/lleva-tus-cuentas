import React from 'react';

const SubscriptionCard = () => {
	// URL query parameters string
	const queryString =
		'?collection_id=1315485636&collection_status=approved&payment_id=1315485636&status=approved&external_reference=null&payment_type=credit_card&merchant_order_id=12482676543&preference_id=21784512-f079bdc3-a852-4573-a0c0-494ae0e6b587&site_id=MLA&processing_mode=aggregator&merchant_account_id=null';

	// Create a URLSearchParams object
	const urlSearchParams = new URLSearchParams(queryString);

	// Extract the values you need
	const paymentId = urlSearchParams.get('payment_id');
	const status = urlSearchParams.get('status');
	const orderId = urlSearchParams.get('merchant_order_id');
	const paymentType = urlSearchParams.get('payment_type');

	console.log('Payment ID:', paymentId);
	console.log('Status:', status);
	console.log('Order ID:', orderId);
	console.log('Payment Type:', paymentType);

	return (
		<div className='flex items-center justify-center flex-col mt-10 lg:mt-0 dark:bg-gray-900'>
			<iframe
				src='https://ltc-subscripcion.vercel.app/'
				title='Subscription Website'
				className='w-full'
				style={{ height: '600px' }}
			/>
		</div>
	);
};

export default SubscriptionCard;
