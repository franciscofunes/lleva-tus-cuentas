import React from 'react';
import payOnline from '../imgs/payOnline.svg';
import { motion } from 'framer-motion';

const SubscriptionCard = () => {
	return (
		<div className='flex items-center justify-center flex-col mt-10 dark:bg-gray-900'>
			<div className='p-4 md:p-10 w-full max-w-md relative'>
				{/* Main Card */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 0.8 }}
					className='rounded-xl bg-zinc-200 dark:bg-[#1E293B] p-6 md:p-10 shadow-xl relative'
				>
					<div className='flex flex-col justify-center items-center text-center'>
						<div className='max-w-sm font-bold font-sans italic text-indigo-500'>
							"Experimenta lo mejor de nuestra aplicación con nuestra
							Suscripción Premium sin anuncios"
						</div>
						<div className='font-light max-w-lg mt-5 text-sm text-[#718096] dark:text-[#A0AEC0]'>
							La suscripción Premium te ofrece una experiencia sin publicidad en
							nuestra aplicación por solo 800 AR$ al mes.
						</div>
					</div>

					{/* Inner Card */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.8, duration: 0.8 }}
						className='rounded-xl bg-[#FFFBEC] dark:bg-gray-600 mt-5 p-6 md:p-8'
					>
						<div className='font-semibold text-lg text-[#1E293B] dark:text-white'>
							Premium Pack
						</div>
						<div className='text-sm font-light text-[#718096] dark:text-[#A0AEC0]'>
							Libre de publicidad
						</div>
						<div className='my-4'>
							<span className='font-bold text-base text-[#1E293B] dark:text-white'>
								2500 AR$
							</span>
							<span className='font-light text-sm text-[#718096] dark:text-[#A0AEC0]'>
								/mes
							</span>
						</div>
						<button className='get-started-btn text-white px-4 py-3 rounded-full border shadow-xl mt-4 transition duration-300 ease-in-out'>
							Suscribirme
						</button>
					</motion.div>

					{/* Image in the bottom right corner */}
					<motion.div
						initial={{ opacity: 0, x: 50, y: 50 }}
						animate={{ opacity: 1, x: 0, y: 0 }}
						transition={{ delay: 0.8, duration: 0.8 }}
						className='absolute bottom-0 right-0 h-24 w-24 md:h-32 md:w-32 overflow-hidden'
					>
						<img
							src={payOnline}
							alt='safe'
							className='w-full h-full object-cover'
						/>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
};

export default SubscriptionCard;
