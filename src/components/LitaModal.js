import React from 'react';
import { motion } from 'framer-motion';
import AdvicesAccordion from './AdvicesAccordion';

const LitaModal = ({ setShowModal, showModal }) => {
	const handleCloseModalClick = () => {
		setShowModal(false);
	};

	return (
		<>
			<motion.div
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ duration: 0.2, type: 'tween', delay: 0.1 }}
				id='card'
				className='flex justify-start overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none bg-opacity-75 transition-opacity backdrop-blur dark:z-100'
			>
				<div className='flex justify-start overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none bg-opacity-75 transition-opacity backdrop-blur dark:z-100'>
					<div className='absolute right-2 left-2 w-auto my-5 mx-auto max-w-2xl border-4 border-purple-600 rounded-lg dark:bg-gray-900'>
						<div className=' shadow-lg relative flex flex-col w-full bg-white outline-none p-4 focus:outline-none dark:bg-gray-900'>
							<div className='flex items-start justify-between  p-6 border-b border-solid border-gray-300 rounded-t '>
								<h4 className='text-2xl font=semibold dark:text-white'>
									Hola soy LITA 🤖 <br />
									<span className='text-purple-600 text-base italic dark:text-zinc-300'>
										Tu consejera financiera
									</span>
								</h4>
								<button
									className='bg-transparent border-0 text-black float-right'
									onClick={handleCloseModalClick}
								>
									<span className='text-black opacity-7 h-8 w-8 text-xl block bg-gray-400 py-0 rounded-full'>
										x
									</span>
								</button>
							</div>

							<AdvicesAccordion />

							<div className='flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b'>
								<button
									className='text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1'
									type='button'
									onClick={handleCloseModalClick}
								>
									Cerrar
								</button>
							</div>
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
};

export default LitaModal;
