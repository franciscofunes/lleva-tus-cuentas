import { AnimatePresence, motion } from 'framer-motion';
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
					className='fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3'
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.2 }}
				>
					<AnimatePresence>
						{isOpen && (
							<motion.div
								id='ltc-floating-actions'
								className='w-[min(17rem,calc(100vw-2.5rem))] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95'
								initial={{ opacity: 0, y: 12, scale: 0.97 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: 10, scale: 0.97 }}
								transition={{ duration: 0.18 }}
							>
								<p className='px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400'>
									Acciones rápidas
								</p>

								<div className='space-y-1.5'>
									<button
										type='button'
										onClick={() => runAction(openTransactionModal)}
										className='group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-purple-200 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:border-purple-500/30 dark:hover:bg-purple-950/30'
									>
										<span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300'>
											<FaPlus className='h-4 w-4' />
										</span>
										<span className='min-w-0'>
											<span className='block text-sm font-extrabold text-slate-900 dark:text-white'>
												{primaryLabel}
											</span>
											<span className='mt-0.5 block text-xs text-slate-500 dark:text-slate-400'>
												Crear un nuevo registro
											</span>
										</span>
									</button>

									<button
										type='button'
										onClick={() => runAction(openLitaModal)}
										className='group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-purple-200 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:border-purple-500/30 dark:hover:bg-purple-950/30'
									>
										<span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300'>
											<FaRobot className='h-4 w-4' />
										</span>
										<span className='min-w-0'>
											<span className='block text-sm font-extrabold text-slate-900 dark:text-white'>
												Preguntar a LITA
											</span>
											<span className='mt-0.5 block text-xs text-slate-500 dark:text-slate-400'>
												Analizar con el asistente
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
						className='inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-xl shadow-purple-950/30 transition-colors hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
						whileTap={{ scale: 0.94 }}
					>
						<motion.span
							animate={{ rotate: isOpen ? 45 : 0 }}
							transition={{ duration: 0.18 }}
							className='inline-flex'
						>
							<FaPlus className='h-6 w-6' />
						</motion.span>
					</motion.button>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default FloatingMenu;
