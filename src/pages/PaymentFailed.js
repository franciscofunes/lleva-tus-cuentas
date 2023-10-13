import { motion } from 'framer-motion';
import React from 'react';
import { Link } from 'react-router-dom';
import PaymentFailure from '../imgs/paymentFailure.svg';

const PaymentFailed = () => {
	const failureVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: { opacity: 1, x: 0 },
	};

	return (
		<div className='flex items-center justify-center mt-10 p-4 lg:mt-0 dark:bg-gray-900'>
			<motion.div
				initial='hidden'
				animate='visible'
				variants={failureVariants}
				className='max-w-3xl w-full p-4 bg-white dark:bg-gray-800 rounded-md shadow-md flex flex-col sm:flex-row mt-4'
			>
				<div className='sm:w-1/2 p-4 flex flex-col'>
					<div className='flex items-center mb-4'>
						<h2 className='text-red-500 text-2xl font-semibold mr-2'>
							Pago de Suscripción Fallido
						</h2>
					</div>
					<p className='text-lg dark:text-indigo-400'>
						¡Inténtelo de nuevo yendo a la página de suscripción!
					</p>
					<Link to='/subscripcion'>
						<button className='mt-4 text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded'>
							Volver a intentar
						</button>
					</Link>
				</div>
				<div className='sm:w-1/2 p-4 flex items-center justify-center'>
					<img
						src={PaymentFailure}
						alt='Payment Failure'
						className='w-48 h-48 sm:w-64 sm:h-64'
					/>
				</div>
			</motion.div>
		</div>
	);
};

export default PaymentFailed;
