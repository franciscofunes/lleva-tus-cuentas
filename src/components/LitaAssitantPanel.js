import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
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

const getPageTheme = () =>
	document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const LitaAssistantPanel = ({
	isOpen,
	setIsOpen,
	section = 'transactions',
	context = {},
}) => {
	const iframeRef = useRef(null);
	const user = useSelector((state) => state.auth.user);
	const [chatHistory, setChatHistory] = useState([]);
	const [theme, setTheme] = useState(getPageTheme);
	const [isExpanded, setIsExpanded] = useState(false);

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

	const sendTheme = useCallback(() => {
		postToLita({ type: 'lita:theme', payload: theme });
	}, [postToLita, theme]);

	// Theme changes can originate outside this component (e.g. Navbar toggle).
	useEffect(() => {
		const root = document.documentElement;
		const updateTheme = () => setTheme(getPageTheme());
		const observer = new MutationObserver(updateTheme);
		observer.observe(root, { attributes: true, attributeFilter: ['class'] });
		updateTheme();
		return () => observer.disconnect();
	}, []);

	// Don't scroll the page behind the fixed chat on touch devices.
	useEffect(() => {
		if (!isOpen) return undefined;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isOpen]);

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
			// Authenticate both the sender origin and the exact iframe window.
			if (event.origin !== targetOrigin || event.source !== iframeRef.current?.contentWindow) return;

			if (event.data === 'closeLitaPanel' || event.data?.type === 'lita:close') {
				setIsOpen(false);
				return;
			}

			if (event.data?.type === 'lita:ready') {
				sendContext();
				sendHistory();
				sendTheme();
				postToLita({ type: 'lita:layout', payload: { expanded: isExpanded } });
				return;
			}

			if (event.data?.type === 'lita:resize' && typeof event.data?.payload?.expanded === 'boolean') {
				setIsExpanded(event.data.payload.expanded);
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
			if (event.key !== 'Escape') return;
			if (isExpanded) setIsExpanded(false);
			else setIsOpen(false);
		};

		window.addEventListener('message', handleMessage);
		window.addEventListener('keydown', handleEscape);
		return () => {
			window.removeEventListener('message', handleMessage);
			window.removeEventListener('keydown', handleEscape);
		};
	}, [
		isOpen,
		isExpanded,
		postToLita,
		sendContext,
		sendHistory,
		sendTheme,
		setIsOpen,
		targetOrigin,
		user?.uid,
	]);

	// Resend on initial mount and any theme/context/history updates.
	useEffect(() => {
		if (!isOpen) return;
		sendContext();
		sendHistory();
		sendTheme();
	}, [isOpen, sendContext, sendHistory, sendTheme]);

	useEffect(() => {
		if (isOpen) postToLita({ type: 'lita:layout', payload: { expanded: isExpanded } });
	}, [isOpen, isExpanded, postToLita]);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.button
						type='button'
						aria-label='Cerrar LITA'
						className='fixed inset-0 z-[74] bg-slate-950/30 backdrop-blur-[1px] dark:bg-slate-950/55'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						onClick={() => setIsOpen(false)}
					/>

					<motion.aside
						key='lita-panel'
						className={[
							'fixed z-[80] flex flex-col overflow-hidden border shadow-2xl shadow-black/40',
							'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950',
							isExpanded
								? 'inset-0 h-[100dvh] w-full max-h-none rounded-none border-0'
								: 'bottom-3 left-3 right-3 h-[76dvh] max-h-[720px] rounded-3xl sm:bottom-5 sm:left-auto sm:right-5 sm:h-[72dvh] sm:w-[420px] lg:w-[440px]',
						].join(' ')}
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 18, scale: 0.98 }}
						transition={{ type: 'spring', stiffness: 360, damping: 32 }}
						aria-label='LITA, asistente financiero'
					>
						<div className='flex h-11 shrink-0 items-center justify-end gap-2 border-b border-slate-200 bg-white px-2.5 dark:border-slate-800 dark:bg-slate-950'>
							<button
								type='button'
								onClick={() => setIsExpanded((value) => !value)}
								className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
								aria-label={isExpanded ? 'Restaurar tamaño de LITA' : 'Expandir LITA a pantalla completa'}
								aria-pressed={isExpanded}
								title={isExpanded ? 'Restaurar tamaño' : 'Pantalla completa'}
							>
								{isExpanded ? <FiMinimize2 className='h-4 w-4' /> : <FiMaximize2 className='h-4 w-4' />}
							</button>
							<button
								type='button'
								onClick={() => setIsOpen(false)}
								id='lita-assistant-panel-close-button'
								className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white'
								aria-label='Cerrar LITA'
							>
								<IoMdClose className='h-5 w-5' />
							</button>
						</div>

						<iframe
							ref={iframeRef}
							src={src}
							title='Lita Assistant'
							className='min-h-0 w-full flex-1 border-none bg-white dark:bg-slate-950'
							onLoad={() => {
								sendContext();
								sendHistory();
								sendTheme();
								postToLita({ type: 'lita:layout', payload: { expanded: isExpanded } });
							}}
						/>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
};

export default LitaAssistantPanel;
