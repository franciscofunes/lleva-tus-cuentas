import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { IoMdClose } from 'react-icons/io';

const GenericModal = ({ show, component: Component, closeModal, ...props }) => {
	const content = React.isValidElement(Component) ? Component : <Component {...props} />;

	useEffect(() => {
		if (!show) return undefined;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const handleEscape = (event) => {
			if (event.key === 'Escape') closeModal();
		};

		document.addEventListener('keydown', handleEscape);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleEscape);
		};
	}, [show, closeModal]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					className='fixed inset-0 z-[90] overflow-y-auto overscroll-contain p-3 sm:p-6'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<button
						type='button'
						className='fixed inset-0 cursor-default bg-slate-950/70 backdrop-blur-[1px]'
						onClick={closeModal}
						aria-label='Cerrar modal'
						tabIndex={-1}
					/>

					<div className='relative flex min-h-full items-center justify-center'>
						<motion.div
							role='dialog'
							aria-modal='true'
							className='relative flex w-full max-w-2xl max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-purple-500/70 bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white sm:max-h-[calc(100vh-3rem)] sm:max-h-[calc(100dvh-3rem)]'
							initial={{ opacity: 0, y: 24, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 24, scale: 0.98 }}
							transition={{ duration: 0.2 }}
						>
							<div className='absolute right-3 top-3 z-20'>
								<button
									type='button'
									className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800/95 dark:text-white dark:hover:bg-slate-700'
									onClick={closeModal}
									aria-label='Cerrar'
								>
									<IoMdClose size={22} />
								</button>
							</div>

							<div
								className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-16 sm:px-6 sm:pb-6 sm:pt-6'
								style={{ WebkitOverflowScrolling: 'touch' }}
							>
								{content}
							</div>
						</motion.div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default GenericModal;
