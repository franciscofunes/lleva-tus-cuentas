import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getPopoverMotion, getPopoverTap } from '../shared/animations/popoverMotion';
import React, { useEffect, useRef, useState } from 'react';
import { FaPlus, FaRobot } from 'react-icons/fa';

const FloatingMenu = ({
	openTransactionModal,
	openLitaModal,
	isModalOpen,
	primaryMessage = 'Transacción',
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef(null);
	const prefersReducedMotion = useReducedMotion();

	useEffect(() => {
		if (isModalOpen) setIsOpen(false);
	}, [isModalOpen]);

	useEffect(() => {
		if (!isOpen) return undefined;

		const handleOutsideClick = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};

		const handleEscape = (event) => {
			if (event.key === 'Escape') setIsOpen(false);
		};

		document.addEventListener('pointerdown', handleOutsideClick);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('pointerdown', handleOutsideClick);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen]);

	const runAction = (action) => {
		setIsOpen(false);
		action?.();
	};

	const primaryLabel = `Agregar ${primaryMessage.toLowerCase()}`;

	return (
		<AnimatePresence>
			{!isModalOpen && (
				<motion.div
					ref={menuRef}
					className='fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2.5 sm:bottom-5 sm:right-5'
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 8 }}
					transition={{ duration: 0.18, ease: 'easeOut' }}
				>
					<AnimatePresence>
						{isOpen && (
							<motion.div
								id='ltc-floating-actions'
								className='w-60 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30'
								{...getPopoverMotion(prefersReducedMotion)}
							>
								<p className='px-2.5 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400'>
									Acciones rápidas
								</p>

								<div className='space-y-1'>
									<button
										type='button'
										onClick={() => runAction(openTransactionModal)}
										className='group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:bg-slate-800'
									>
										<span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-200 bg-purple-100 text-purple-600 dark:border-slate-600 dark:bg-slate-800 dark:text-purple-300'>
											<FaPlus className='h-3.5 w-3.5' />
										</span>
										<span className='min-w-0'>
											<span className='block text-sm font-extrabold text-slate-900 dark:text-white'>
												{primaryLabel}
											</span>
											<span className='block text-[11px] text-slate-500 dark:text-slate-400'>
												Nuevo registro
											</span>
										</span>
									</button>

									<button
										type='button'
										onClick={() => runAction(openLitaModal)}
										className='group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:bg-slate-800'
									>
										<span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-200 bg-purple-100 text-purple-600 dark:border-slate-600 dark:bg-slate-800 dark:text-purple-300'>
											<FaRobot className='h-3.5 w-3.5' />
										</span>
										<span className='min-w-0'>
											<span className='block text-sm font-extrabold text-slate-900 dark:text-white'>
												Preguntar a LITA
											</span>
											<span className='block text-[11px] text-slate-500 dark:text-slate-400'>
												Analizar con IA
											</span>
										</span>
									</button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					<motion.button
						type='button'
						onClick={() => setIsOpen((value) => !value)}
						aria-label={isOpen ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas'}
						aria-expanded={isOpen}
						aria-controls='ltc-floating-actions'
						className='inline-flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-950/20 backdrop-blur transition-colors hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:border-purple-500 dark:bg-purple-600 dark:hover:bg-purple-500'
						whileTap={getPopoverTap(prefersReducedMotion)}
						transition={{ type: 'spring', stiffness: 420, damping: 28 }}
					>
						<motion.span
							animate={{ rotate: isOpen ? 45 : 0 }}
							transition={{ duration: 0.16, ease: 'easeOut' }}
							className='inline-flex'
						>
							<FaPlus className='h-5 w-5' />
						</motion.span>
					</motion.button>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default FloatingMenu;
