import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';
import {
	LITA_CHAT_LOCALHOST,
	LITA_CHAT_VERCEL_URL,
} from '../shared/constants/urls.const';
import { queryLitaHistoricalTransactions } from '../services/litaHistoricalAnalysis';
import {
	deleteLitaChat,
	saveLitaChat,
	subscribeLitaChats,
} from '../services/litaChatService';

const getPageTheme = () =>
	document.documentElement.classList.contains('dark') ? 'dark' : 'light';

// Fixed panels in Android Chrome live in the LAYOUT viewport, while the
// keyboard occupies part of the VISUAL viewport. A fixed bottom/100dvh
// panel can therefore leave the iframe composer behind the keyboard.
export const visibleKeyboardLayout = (viewport, fullHeight, width) => {
	if (!viewport || width >= 640 || viewport.scale > 1.05) return null;
	const height = Math.round(viewport.height);
	if (!Number.isFinite(height) || height <= 0 || fullHeight - height < 120) return null;
	return {
		top: Math.max(0, Math.round(viewport.offsetTop || 0)),
		height,
	};
};


const LitaAssistantPanel = ({
	isOpen,
	setIsOpen,
	section = 'transactions',
	context = {},
}) => {
	const iframeRef = useRef(null);
	const user = useSelector((state) => state.auth.user);
	const [chatHistory, setChatHistory] = useState([]);
	const [historyStatus, setHistoryStatus] = useState({ state: 'loading' });
	const [historyRefresh, setHistoryRefresh] = useState(0);
	const [theme, setTheme] = useState(getPageTheme);
	const [isExpanded, setIsExpanded] = useState(false);
	const [keyboardViewport, setKeyboardViewport] = useState(null);
	const largestViewportHeightRef = useRef(0);

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

	const sendHistoryStatus = useCallback(() => {
		postToLita({ type: 'lita:history:status', payload: historyStatus });
	}, [historyStatus, postToLita]);

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

	// Align the entire iframe to the actual visible region while the mobile
	// keyboard is open. Do NOT scroll the host document or remount the iframe:
	// either would lose the chat input's focus / cursor position on Android.
	useEffect(() => {
		if (!isOpen) {
			setKeyboardViewport(null);
			return undefined;
		}
		const viewport = window.visualViewport;
		if (!viewport) return undefined;

		largestViewportHeightRef.current = Math.max(window.innerHeight, viewport.height);
		let currentWidth = window.innerWidth;
		const updateViewport = () => {
			if (window.innerWidth !== currentWidth) {
				// Rotation / actual width change: forget the portrait baseline.
				currentWidth = window.innerWidth;
				largestViewportHeightRef.current = Math.max(window.innerHeight, viewport.height);
			}
			largestViewportHeightRef.current = Math.max(
				largestViewportHeightRef.current, window.innerHeight, viewport.height
			);
			const next = visibleKeyboardLayout(
				viewport, largestViewportHeightRef.current, window.innerWidth
			);
			setKeyboardViewport((previous) =>
				previous?.top === next?.top && previous?.height === next?.height
					? previous : next
			);
		};
		updateViewport();
		viewport.addEventListener('resize', updateViewport);
		viewport.addEventListener('scroll', updateViewport);
		window.addEventListener('resize', updateViewport);
		return () => {
			viewport.removeEventListener('resize', updateViewport);
			viewport.removeEventListener('scroll', updateViewport);
			window.removeEventListener('resize', updateViewport);
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return undefined;
		setChatHistory([]);
		if (!user?.uid) {
			setHistoryStatus({ state: 'unavailable', reason: 'unauthenticated' });
			return undefined;
		}
		setHistoryStatus({ state: 'loading' });
		return subscribeLitaChats(
			user.uid,
			(threads) => {
				setChatHistory(threads);
				setHistoryStatus({ state: 'ready' });
			},
			(error) => {
				console.warn('Could not load LITA chat history', error);
				setHistoryStatus({
					state: 'error',
					reason: error?.code === 'permission-denied' ? 'permission-denied' : 'read-failed',
				});
			}
		);
	}, [isOpen, user?.uid, historyRefresh]);

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
				sendHistoryStatus();
				sendTheme();
				postToLita({ type: 'lita:layout', payload: { expanded: isExpanded } });
				return;
			}

			if (event.data?.type === 'lita:historical:request') {
				const request = event.data.payload || {};
				if (typeof request.requestId !== 'string' ||
					!/^[a-zA-Z0-9_-]{1,70}$/.test(request.requestId)) return;
				const response = { type: 'lita:historical:result', payload: {
					requestId: request.requestId, success: false,
				} };
				if (!user?.uid || section !== 'transactions') {
					response.payload.reason = 'La consulta requiere tu sesión de Transacciones.';
				} else {
					try {
						const result = await queryLitaHistoricalTransactions({
							userId: user.uid,
							from: request.from,
							to: request.to,
						}, context?.categories || []);
						response.payload = { requestId: request.requestId, success: true, result };
					} catch (error) {
						response.payload.reason = error?.message || 'No se pudo consultar el período.';
					}
				}
				postToLita(response);
				return;
			}

			if (event.data?.type === 'lita:history:refresh') {
				setHistoryRefresh((value) => value + 1);
				return;
			}

			if (event.data?.type === 'lita:resize' && typeof event.data?.payload?.expanded === 'boolean') {
				setIsExpanded(event.data.payload.expanded);
				return;
			}

			if (event.data?.type === 'lita:history:save') {
				const { requestId, id } = event.data.payload || {};
				if (typeof requestId !== 'string' || !requestId || typeof id !== 'string' || !id) return;
				let result = { type: 'lita:history:save:result', payload: { requestId, id, success: false, reason: 'write-failed' } };
				if (!user?.uid) {
					result.payload.reason = 'unauthenticated';
				} else {
					try {
						await saveLitaChat(user.uid, event.data.payload);
						result.payload = { requestId, id, success: true };
					} catch (error) {
						console.warn('Could not save LITA chat history', error);
						result.payload.reason = error?.code === 'permission-denied' ? 'permission-denied' : 'write-failed';
					}
				}
				postToLita(result);
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
		sendHistoryStatus,
		sendTheme,
		setIsOpen,
		targetOrigin,
		user?.uid,
		section,
		context?.categories,
	]);

	// Resend on initial mount and any theme/context/history updates.
	useEffect(() => {
		if (!isOpen) return;
		sendContext();
		sendHistory();
		sendHistoryStatus();
		sendTheme();
	}, [isOpen, sendContext, sendHistory, sendHistoryStatus, sendTheme]);

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
					style={keyboardViewport ? {
						top: keyboardViewport.top,
						bottom: 'auto',
						left: 0,
						right: 0,
						width: '100%',
						height: keyboardViewport.height,
						maxHeight: 'none',
						borderRadius: 0,
					} : undefined}
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
								sendHistoryStatus();
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
