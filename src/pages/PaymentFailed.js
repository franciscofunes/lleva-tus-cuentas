import React from 'react';
import { motion } from 'framer-motion';
import { RiCloseFill } from 'react-icons/ri';
import { Link } from 'react-router-dom';

const PaymentFailed = () => {
	const failureVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: { opacity: 1, x: 0 },
	};

	return (
		<div className='flex items-center justify-center flex-col mt-10 lg:mt-0 dark:bg-gray-900'>
			<motion.div initial='hidden' animate='visible' variants={failureVariants}>
				<div className='flex items-center mb-4'>
					<h2 className='text-red-500 text-2xl font-semibold mr-2'>
						Pago de Suscripción Fallido
					</h2>
					<RiCloseFill className='text-red-500 text-2xl' />
				</div>
				<p className='text-lg dark:text-indigo-400'>
					¡Inténtelo de nuevo yendo a la página de suscripción!
				</p>
				<Link to='/subscripcion'>
					<button className='mt-4 text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded'>
						Volver a intentar
					</button>
				</Link>
			</motion.div>
		</div>
	);
};

export default PaymentFailed;
