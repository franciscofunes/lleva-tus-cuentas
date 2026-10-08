import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { IoMdClose } from 'react-icons/io';
import {
	LITA_CHAT_LOCALHOST,
	LITA_CHAT_VERCEL_URL,
} from '../shared/constants/urls.const';
import {
	deleteLitaChat,
	saveLitaChat,
	subscribeLitaChats,
} from '../services/litaChatService';

const LitaAssistantPanel = ({
	isOpen,
	setIsOpen,
	section = 'transactions',
	context = {},
}) => {
	const iframeRef = useRef(null);
	const user = useSelector((state) => state.auth.user);
	const [chatHistory, setChatHistory] = useState([]);

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

	const postToLita = useCallback(
		(message) => {
			if (!targetOrigin || !iframeRef.current?.contentWindow) return;
			iframeRef.current.contentWindow.postMessage(message, targetOrigin);
		},
		[targetOrigin]
	);

	const sendContext = useCallback(() => {
		postToLita({
			type: 'lita:context',
			payload: financialContext,
		});
	}, [financialContext, postToLita]);

	const sendHistory = useCallback(() => {
		postToLita({
			type: 'lita:history',
			payload: chatHistory,
		});
	}, [chatHistory, postToLita]);

	useEffect(() => {
		if (!isOpen || !user?.uid) return undefined;

		return subscribeLitaChats(
			user.uid,
			setChatHistory,
			(error) => console.warn('Could not load LITA chat history', error)
		);
	}, [isOpen, user?.uid]);

	useEffect(() => {
		if (!isOpen || !targetOrigin) return undefined;

		const handleMessage = async (event) => {
			if (event.origin !== targetOrigin) return;

			if (event.data === 'closeLitaPanel' || event.data?.type === 'lita:close') {
				setIsOpen(false);
				return;
			}

			if (event.data?.type === 'lita:ready') {
				sendContext();
				sendHistory();
				return;
			}

			if (event.data?.type === 'lita:history:save' && user?.uid) {
				try {
					await saveLitaChat(user.uid, event.data.payload);
				} catch (error) {
					console.warn('Could not save LITA chat history', error);
				}
				return;
			}

			if (event.data?.type === 'lita:history:delete' && user?.uid) {
				try {
					await deleteLitaChat(user.uid, event.data?.payload?.id);
				} catch (error) {
					console.warn('Could not delete LITA chat history', error);
				}
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
	}, [
		isOpen,
		sendContext,
		sendHistory,
		setIsOpen,
		targetOrigin,
		user?.uid,
	]);

	useEffect(() => {
		if (!isOpen) return;
		sendContext();
		sendHistory();
	}, [isOpen, sendContext, sendHistory]);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.button
						type='button'
						aria-label='Cerrar LITA'
						className='fixed inset-0 z-[74] bg-slate-950/30 backdrop-blur-[1px]'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						onClick={() => setIsOpen(false)}
					/>

					<motion.aside
						key='lita-panel'
						className='fixed bottom-3 left-3 right-3 z-[80] flex h-[76dvh] max-h-[720px] flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40 sm:bottom-5 sm:left-auto sm:right-5 sm:h-[72dvh] sm:w-[420px] lg:w-[440px]'
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 18, scale: 0.98 }}
						transition={{ type: 'spring', stiffness: 360, damping: 32 }}
						aria-label='LITA, asistente financiero'
					>
						<div className='flex h-11 shrink-0 items-center justify-end border-b border-slate-800 bg-slate-950 px-2.5'>
							<button
								type='button'
								onClick={() => setIsOpen(false)}
								id='lita-assistant-panel-close-button'
								className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500'
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
							onLoad={() => {
								sendContext();
								sendHistory();
							}}
						/>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
};

export default LitaAssistantPanel;
