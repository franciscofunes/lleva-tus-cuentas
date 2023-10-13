import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RiCheckFill } from 'react-icons/ri';

const PaymentSuccess = () => {
	const paymentIdRef = useRef(null);
	const statusRef = useRef(null);
	const orderIdRef = useRef(null);
	const paymentTypeRef = useRef(null);
	const DEFAULT_VALUE = '-';

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);

		paymentIdRef.current = searchParams.get('payment_id');
		statusRef.current = searchParams.get('status');
		orderIdRef.current = searchParams.get('merchant_order_id');
		paymentTypeRef.current = searchParams.get('payment_type');
	}, []);

	const successVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0 },
	};

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
					<li>ID de Pago: {paymentIdRef.current ?? DEFAULT_VALUE}</li>
					<li>Estado: {statusRef.current ?? DEFAULT_VALUE}</li>
					<li>ID de Pedido: {orderIdRef.current ?? DEFAULT_VALUE}</li>
					<li>Tipo de Pago: {paymentTypeRef.current ?? DEFAULT_VALUE}</li>
				</ul>
			</motion.div>
		</div>
	);
};

export default PaymentSuccess;
