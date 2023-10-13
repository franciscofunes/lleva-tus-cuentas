import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RiCheckFill } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
	const DEFAULT_VALUE = '-';
	const [searchParams, setSearchParams] = useSearchParams();

	const successVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0 },
	};

	console.log(searchParams.get['collection_status']);

	return (
		<div className='flex items-center justify-center flex-col mt-10 lg:mt-0 dark:bg-gray-900'>
			<motion.div initial='hidden' animate='visible' variants={successVariants}>
				<div className='flex items-center mb-4'>
					<h2 className='text-green-500 text-2xl font-semibold mr-2'>
						Pago Exitoso
					</h2>
					<RiCheckFill className='text-green-500 text-2xl' />
				</div>
				<ul className='list-inside list-disc text-lg dark:text-indigo-400'>
					<li>ID de Pago: {searchParams.get('payment_id')}</li>
					<li>Estado: {searchParams.get('collection_status')}</li>
					<li>ID de Pedido: {searchParams.get('merchant_order_id')}</li>
					<li>Tipo de Pago: {searchParams.get('payment_type')}</li>
				</ul>
			</motion.div>
		</div>
	);
};

// ?collection_id=1315486726&collection_status=approved&payment_id=1315486726&status=approved&external_reference=null&payment_type=credit_card&merchant_order_id=12489219194&preference_id=21784512-c940fb5d-0f32-4238-9a0f-fed7e22178f2&site_id=MLA&processing_mode=aggregator&merchant_account_id=null

export default PaymentSuccess;
