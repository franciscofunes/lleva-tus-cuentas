import React from 'react';
import { IoMdClose } from 'react-icons/io';
import { motion, AnimatePresence } from 'framer-motion';

const GenericModal = ({ show, component: Component, closeModal, ...props }) => {
	return (
		<AnimatePresence>
			{show && (
				<motion.div
					className='fixed z-50 inset-0 flex items-center justify-center overflow-y-auto'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3 }}
				>
					<div className='fixed inset-0 transition-opacity'>
						<div className='absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900'></div>
					</div>
					<motion.div
						className='border-purple-600 bg-gray-600 dark:bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full'
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 50 }}
						transition={{ duration: 0.3 }}
					>
						<div className='relative'>
							<Component {...props} />
							<button
								className='absolute top-0 right-0 p-2 text-black hover:text-white dark:text-white'
								onClick={closeModal}
							>
								<IoMdClose size={24} />
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default GenericModal;
