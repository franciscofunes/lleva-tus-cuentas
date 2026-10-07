import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FaRobot } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import {
	LITA_CHAT_LOCALHOST,
	LITA_CHAT_VERCEL_URL,
} from '../shared/constants/urls.const';

const LitaAssistantPanel = ({
	isOpen,
	setIsOpen,
	section = 'transactions',
	context = {},
}) => {
	const iframeRef = useRef(null);

	const src =
		process.env.NODE_ENV === 'development'
			? LITA_CHAT_LOCALHOST
			: LITA_CHAT_VERCEL_URL;

	const targetOrigin = useMemo(() => {
		try {
			return new URL(src).origin;
		} catch {
			return '';
		}
	}, [src]);

	const financialContext = useMemo(
		() => ({
			section,
			...context,
		}),
		[section, context]
	);

	const sendContext = useCallback(() => {
		if (!targetOrigin || !iframeRef.current?.contentWindow) return;

		iframeRef.current.contentWindow.postMessage(
			{
				type: 'lita:context',
				payload: financialContext,
			},
			targetOrigin
		);
	}, [financialContext, targetOrigin]);

	useEffect(() => {
		if (!isOpen || !targetOrigin) return undefined;

		const handleMessage = (event) => {
			if (event.origin !== targetOrigin) return;

			if (event.data === 'closeLitaPanel' || event.data?.type === 'lita:close') {
				setIsOpen(false);
				return;
			}

			if (event.data?.type === 'lita:ready') {
				sendContext();
			}
		};

		const handleEscape = (event) => {
			if (event.key === 'Escape') setIsOpen(false);
		};

		window.addEventListener('message', handleMessage);
		window.addEventListener('keydown', handleEscape);

		return () => {
			window.removeEventListener('message', handleMessage);
			window.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, sendContext, setIsOpen, targetOrigin]);

	useEffect(() => {
		if (isOpen) sendContext();
	}, [isOpen, sendContext]);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.button
						type='button'
						aria-label='Cerrar LITA'
						className='fixed inset-0 z-[74] bg-slate-950/20 backdrop-blur-[1px] sm:bg-slate-950/10'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						onClick={() => setIsOpen(false)}
					/>

					<motion.aside
						key='lita-panel'
						className='fixed bottom-3 right-3 z-[80] flex h-[76dvh] max-h-[720px] w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700/90 dark:bg-slate-900 sm:bottom-5 sm:right-5 sm:h-[72dvh] sm:w-[420px] lg:w-[440px]'
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 18, scale: 0.98 }}
						transition={{ type: 'spring', stiffness: 360, damping: 32 }}
						aria-label='LITA, asistente financiero'
					>
						<div className='flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3.5 py-3 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95'>
							<div className='flex min-w-0 items-center gap-2.5'>
								<span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300'>
									<FaRobot className='h-4 w-4' />
								</span>
								<div className='min-w-0'>
									<div className='flex items-center gap-2'>
										<h2 className='text-sm font-extrabold text-slate-900 dark:text-white'>LITA</h2>
										<span className='rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'>
											{section === 'portfolio' ? 'Portfolio' : 'Transacciones'}
										</span>
									</div>
									<p className='truncate text-[11px] text-slate-500 dark:text-slate-400'>
										Asistente financiero de LTC
									</p>
								</div>
							</div>

							<button
								type='button'
								onClick={() => setIsOpen(false)}
								id='lita-assistant-panel-close-button'
								className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
								aria-label='Cerrar LITA'
							>
								<IoMdClose className='h-5 w-5' />
							</button>
						</div>

						<iframe
							ref={iframeRef}
							src={src}
							title='Lita Assistant'
							className='min-h-0 w-full flex-1 border-none bg-slate-950'
							onLoad={sendContext}
						/>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
};

export default LitaAssistantPanel;
