import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	FaBell,
	FaCalendarAlt,
	FaCheck,
	FaExclamationCircle,
} from 'react-icons/fa';
import { RiAdvertisementLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getPaymentDataAction } from '../actionCreators/databaseActions';
import {
	backfillExpenseNotifications,
	markNotificationRead,
	pruneExpiredNotifications,
	subscribeNotifications,
} from '../services/notificationService';
import {
	daysUntilDueDate,
	isVisibleReminder,
} from '../utils/notificationLifecycle';

const dueLabel = (days) => {
	if (days < -1) return `Venció hace ${Math.abs(days)} días`;
	if (days === -1) return 'Venció ayer';
	if (days === 0) return 'Vence hoy';
	if (days === 1) return 'Vence mañana';
	return `Vence en ${days} días`;
};

const money = (value) => {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return '';
	return new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 2,
	}).format(amount);
};

const ReminderItem = ({ notification, onOpen }) => {
	const days = daysUntilDueDate(notification.dueDate);
	const isOverdue = days < 0;
	const isToday = days === 0;

	return (
		<button
			type='button'
			onClick={() => onOpen(notification)}
			className='flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:bg-slate-800'
			role='menuitem'
		>
			<span
				className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
					isOverdue
						? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300'
						: isToday
							? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
							: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300'
				}`}
			>
				{isOverdue ? <FaExclamationCircle /> : <FaCalendarAlt />}
			</span>
			<span className='min-w-0 flex-1'>
				<span className='flex items-start justify-between gap-2'>
					<span className='truncate text-sm font-extrabold text-slate-900 dark:text-white'>
						{notification.title || 'Vencimiento'}
					</span>
					{notification.readAt && (
						<FaCheck
							className='mt-0.5 shrink-0 text-xs text-slate-400'
							aria-label='Leída'
						/>
					)}
				</span>
				<span
					className={`mt-0.5 block text-xs font-bold ${
						isOverdue
							? 'text-red-500'
							: isToday
								? 'text-amber-500'
								: 'text-purple-500'
					}`}
				>
					{dueLabel(days)}
				</span>
				<span className='mt-1 block truncate text-xs text-slate-500 dark:text-slate-400'>
					{notification.category || 'Transacción'}
					{money(notification.amount) ? ` · ${money(notification.amount)}` : ''}
				</span>
			</span>
		</button>
	);
};

const NotificationDropdown = () => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [subscriptionNoticeRead, setSubscriptionNoticeRead] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [notificationsLoading, setNotificationsLoading] = useState(true);
	const [notificationsError, setNotificationsError] = useState(false);
	const paymentData = useSelector((state) => state.database.paymentData);
	const isPaymentDataLoading = useSelector(
		(state) => state.database.isPaymentDataLoading
	);
	const user = useSelector((state) => state.auth.user);
	const categories = useSelector((state) => state.database.categories);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const dropdownRef = useRef(null);

	const hasSubscriptionNotice = !isPaymentDataLoading && !paymentData;

	const activeReminders = useMemo(
		() =>
			notifications
				.map((item) => ({ ...item, days: daysUntilDueDate(item.dueDate) }))
				.filter(
					(item) =>
						item.status !== 'dismissed' &&
						isVisibleReminder(item.dueDate, item.leadDays ?? 5)
				)
				.sort((a, b) => a.days - b.days),
		[notifications]
	);

	const overdue = activeReminders.filter((item) => item.days < 0);
	const today = activeReminders.filter((item) => item.days === 0);
	const upcoming = activeReminders.filter((item) => item.days > 0);

	const unreadReminderCount = activeReminders.filter((item) => !item.readAt).length;
	const unreadSubscriptionCount =
		hasSubscriptionNotice && !subscriptionNoticeRead ? 1 : 0;
	const unreadCount = unreadReminderCount + unreadSubscriptionCount;

	useEffect(() => {
		if (user) {
			dispatch(getPaymentDataAction(user.uid));
		}
	}, [dispatch, user]);

	useEffect(() => {
		if (!user?.uid) {
			setNotifications([]);
			setNotificationsLoading(false);
			return undefined;
		}

		setNotificationsLoading(true);
		setNotificationsError(false);
		Promise.resolve()
			.then(() => pruneExpiredNotifications(user.uid))
			.then(() => backfillExpenseNotifications(user.uid, categories || []))
			.catch((error) => {
				console.warn('Could not reconcile transaction reminders', error);
			});

		return subscribeNotifications(
			user.uid,
			(items) => {
				setNotifications(items);
				setNotificationsLoading(false);
			},
			(error) => {
				console.error('Could not load notifications', error);
				setNotificationsError(true);
				setNotificationsLoading(false);
			}
		);
	}, [categories, user?.uid]);

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		};

		const handleEscape = (event) => {
			if (event.key === 'Escape') setShowDropdown(false);
		};

		document.addEventListener('pointerdown', handleOutsideClick);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('pointerdown', handleOutsideClick);
			document.removeEventListener('keydown', handleEscape);
		};
	}, []);

	const handleDropdownToggle = () => {
		setShowDropdown((value) => !value);
		if (hasSubscriptionNotice) setSubscriptionNoticeRead(true);
	};

	const openReminder = async (notification) => {
		try {
			if (!notification.readAt) {
				await markNotificationRead(user.uid, notification.id);
			}
		} catch (error) {
			console.error('Could not mark notification as read', error);
		}
		setShowDropdown(false);
		navigate('/transacciones');
	};

	const renderReminderGroup = (label, items) => {
		if (!items.length) return null;
		return (
			<div className='mt-1'>
				<p className='px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400'>
					{label}
				</p>
				<div className='space-y-0.5'>
					{items.map((notification) => (
						<ReminderItem
							key={notification.id}
							notification={notification}
							onOpen={openReminder}
						/>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className='relative inline-block text-left' ref={dropdownRef}>
			<button
				type='button'
				className='relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-slate-200 dark:hover:bg-slate-800'
				onClick={handleDropdownToggle}
				aria-label={
					unreadCount
						? `Notificaciones, ${unreadCount} sin leer`
						: 'Notificaciones'
				}
				aria-haspopup='menu'
				aria-expanded={showDropdown}
			>
				<FaBell className='text-lg' />
				{unreadCount > 0 && (
					<span className='absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white'>
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				)}
			</button>

			{showDropdown && (
				<div
					className='fixed right-3 top-[4.75rem] z-[100] max-h-[70dvh] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-80'
					role='menu'
					aria-label='Notificaciones'
				>
					<div className='flex items-center justify-between gap-3 px-3 py-2'>
						<div>
							<p className='text-sm font-extrabold text-slate-900 dark:text-white'>
								Notificaciones
							</p>
							<p className='text-[11px] text-slate-500 dark:text-slate-400'>
								Próximos vencimientos y hasta 10 días posteriores.
							</p>
						</div>
						{activeReminders.length > 0 && (
							<span className='rounded-full bg-purple-100 px-2 py-1 text-[10px] font-extrabold text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'>
								{activeReminders.length} activos
							</span>
						)}
					</div>

					{notificationsLoading ? (
						<div className='space-y-2 px-2 py-2'>
							<div className='h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800' />
							<div className='h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800' />
						</div>
					) : notificationsError ? (
						<div className='mx-2 my-2 rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'>
							No pudimos cargar los recordatorios. Revisá los permisos de Firestore para <strong>users/&#123;uid&#125;/notifications</strong>.
						</div>
					) : (
						<>
							{renderReminderGroup('Vencidos', overdue)}
							{renderReminderGroup('Vence hoy', today)}
							{renderReminderGroup('Próximos', upcoming)}
							{activeReminders.length === 0 && (
								<p className='px-3 py-4 text-sm text-slate-500 dark:text-slate-400'>
									No tenés vencimientos dentro de la ventana de aviso.
								</p>
							)}
						</>
					)}

					{hasSubscriptionNotice && (
						<div className='mt-2 border-t border-slate-200 pt-2 dark:border-slate-700'>
							<button
								type='button'
								className='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800'
								role='menuitem'
								onClick={() => {
									setShowDropdown(false);
									navigate('/subscripcion');
								}}
							>
								<span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'>
									<RiAdvertisementLine />
								</span>
								<span>
									<span className='block text-sm font-bold text-slate-900 dark:text-white'>
										Eliminar publicidad
									</span>
									<span className='mt-0.5 block text-xs text-slate-500 dark:text-slate-400'>
										Conocé las opciones de suscripción.
									</span>
								</span>
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default NotificationDropdown;
