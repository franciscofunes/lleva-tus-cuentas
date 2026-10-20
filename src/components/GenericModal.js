import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import { IoMdClose } from 'react-icons/io';

const GenericModal = ({ show, component: Component, closeModal, dialogLabel, ...props }) => {
	const content = React.isValidElement(Component) ? Component : <Component {...props} />;
	const dialogRef = useRef(null);
	const closeButtonRef = useRef(null);
	const closeHandlerRef = useRef(closeModal);
	useEffect(() => { closeHandlerRef.current = closeModal; }, [closeModal]);

	useEffect(() => {
		if (!show) return undefined;

		const previousOverflow = document.body.style.overflow;
		const previousFocus = document.activeElement;
		document.body.style.overflow = 'hidden';
		closeButtonRef.current?.focus();

		const handleModalKeydown = (event) => {
			const dialog = dialogRef.current;
			if (!dialog) return;
			// Editing a category opens a second GenericModal above the transaction form.
			// Only the top-most dialog may handle Escape or trap Tab.
			const openDialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
			if (openDialogs[openDialogs.length - 1] !== dialog) return;

			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				closeHandlerRef.current?.();
				return;
			}
			if (event.key !== 'Tab') return;
			const focusable = Array.from(dialog.querySelectorAll(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)).filter((element) => element.getAttribute('aria-hidden') !== 'true');
			if (!focusable.length) {
				event.preventDefault();
				dialog.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener('keydown', handleModalKeydown);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleModalKeydown);
			if (previousFocus?.isConnected) previousFocus.focus();
		};
	}, [show]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					className='fixed inset-0 z-[90] overflow-hidden overscroll-contain p-2 sm:p-6'
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

					<div className='relative flex h-full min-h-0 items-center justify-center'>
						<motion.div
							ref={dialogRef}
							role='dialog'
							tabIndex={-1}
							aria-modal='true'
							aria-label={dialogLabel}
							className='relative flex h-auto w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-purple-500/70 bg-white text-slate-900 shadow-2xl max-h-[calc(100svh-1rem)] dark:bg-slate-900 dark:text-white sm:max-h-[calc(100dvh-3rem)]'
							initial={{ opacity: 0, y: 24, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 24, scale: 0.98 }}
							transition={{ duration: 0.2 }}
						>
							<div className='absolute right-3 top-3 z-20'>
								<button
									type='button'
									ref={closeButtonRef}
									className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800/95 dark:text-white dark:hover:bg-slate-700'
									onClick={closeModal}
									aria-label='Cerrar'
                    autoFocus={Boolean(dialogLabel)}
								>
									<IoMdClose size={22} />
								</button>
							</div>

							<div
								className='min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pt-16 sm:px-6 sm:pt-6'
								style={{
									WebkitOverflowScrolling: 'touch',
									paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
									scrollbarGutter: 'stable',
								}}
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
