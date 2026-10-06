import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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

	const variants = {
		hidden: { opacity: 0, x: '100%' },
		visible: { opacity: 1, x: '0%', transition: { duration: 0.3 } },
	};

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

		window.addEventListener('message', handleMessage);

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [isOpen, sendContext, setIsOpen, targetOrigin]);

	useEffect(() => {
		if (isOpen) sendContext();
	}, [isOpen, sendContext]);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.aside
					key='lita-panel'
					className='fixed right-0 bottom-0 z-[80] w-[94%] sm:w-[430px] lg:w-[480px] bg-white shadow-2xl dark:bg-slate-900 flex flex-col h-[100dvh] border-l border-slate-200 dark:border-slate-700'
					initial='hidden'
					animate='visible'
					exit='hidden'
					variants={variants}
					aria-label='LITA, asistente financiero'
				>
					<div className='flex justify-between items-center bg-slate-100 p-4 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700'>
						<div>
							<h2 className='text-lg font-bold dark:text-white'>LITA 🤖</h2>
							<p className='text-xs text-slate-500 dark:text-slate-400'>
								Contexto: {section === 'portfolio' ? 'Portfolio' : 'Transacciones'}
							</p>
						</div>
						<button
							type='button'
							onClick={() => setIsOpen(false)}
							id='lita-assistant-panel-close-button'
							className='inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800'
							aria-label='Cerrar LITA'
						>
							<IoMdClose className='h-6 w-6 text-gray-600 dark:text-white' />
						</button>
					</div>

					<iframe
						ref={iframeRef}
						src={src}
						title='Lita Assistant'
						className='w-full flex-1 border-none bg-white'
						onLoad={sendContext}
					/>
				</motion.aside>
			)}
		</AnimatePresence>
	);
};

export default LitaAssistantPanel;
