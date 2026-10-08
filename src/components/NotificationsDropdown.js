import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	FaArrowLeft,
	FaBell,
	FaCalendarAlt,
	FaCheck,
	FaCheckCircle,
	FaExclamationCircle,
	FaReceipt,
} from 'react-icons/fa';
import { RiAdvertisementLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPaymentDataAction } from '../actionCreators/databaseActions';
import {
	backfillExpenseNotifications,
	markNotificationRead,
	pruneExpiredNotifications,
	setNotificationPaymentState,
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

const formatDueDate = (value) => {
	if (!value) return 'Sin fecha';
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-AR');
};

const timestampToDate = (value) => {
	if (!value) return null;
	if (typeof value.toDate === 'function') return value.toDate();
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const ReminderItem = ({ notification, onOpen }) => {
	const days = daysUntilDueDate(notification.dueDate);
	const isPaid = notification.status === 'paid';
	const isOverdue = !isPaid && days < 0;
	const isToday = !isPaid && days === 0;

	const tone = isPaid
		? {
				icon: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
				label: 'text-emerald-600 dark:text-emerald-300',
				text: 'Pagado',
			}
		: isOverdue
			? {
					icon: 'bg-red-500/10 text-red-600 dark:bg-red-900/50 dark:text-red-300',
					label: 'text-red-600 dark:text-red-300',
					text: dueLabel(days),
				}
			: isToday
				? {
						icon: 'bg-amber-500/10 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
						label: 'text-amber-600 dark:text-amber-300',
						text: dueLabel(days),
					}
				: {
						icon: 'bg-purple-500/10 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300',
						label: 'text-purple-600 dark:text-purple-300',
						text: dueLabel(days),
					};

	return (
		<button
			type='button'
			onClick={() => onOpen(notification)}
			className='group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-purple-300 hover:bg-purple-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:hover:border-purple-500/50 dark:hover:bg-slate-700'
			role='menuitem'
		>
			<span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
				{isPaid ? (
					<FaCheckCircle className='h-4 w-4' />
				) : isOverdue ? (
					<FaExclamationCircle className='h-4 w-4' />
				) : (
					<FaCalendarAlt className='h-4 w-4' />
				)}
			</span>

			<span className='min-w-0 flex-1'>
				<span className='flex items-start gap-2'>
					<span className='min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900 dark:text-white'>
						{notification.title || 'Vencimiento'}
					</span>
					{!notification.readAt && !isPaid && (
						<span
							className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-500'
							aria-label='Sin leer'
						/>
					)}
				</span>

				<span className={`mt-0.5 block text-xs font-bold ${tone.label}`}>
					{tone.text}
				</span>

				<span className='mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400'>
					<span className='truncate'>{notification.category || 'Transacción'}</span>
					{money(notification.amount) && (
						<>
							<span aria-hidden='true'>·</span>
							<span className='whitespace-nowrap'>{money(notification.amount)}</span>
						</>
					)}
				</span>
			</span>
		</button>
	);
};

const NotificationDetail = ({
	notification,
	onBack,
	onPaymentChange,
	isSaving,
	onOpenTransaction,
}) => {
	const isPaid = notification.status === 'paid';
	const days = daysUntilDueDate(notification.dueDate);

	return (
		<div className='p-2'>
			<div className='flex items-center gap-2 px-1 pb-3'>
				<button
					type='button'
					onClick={onBack}
					className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
					aria-label='Volver a notificaciones'
				>
					<FaArrowLeft className='h-3.5 w-3.5' />
				</button>
				<div className='min-w-0'>
					<p className='truncate text-base font-extrabold text-slate-900 dark:text-white'>
						{notification.title || 'Vencimiento'}
					</p>
					<p className='text-xs text-slate-500 dark:text-slate-400'>
						Detalle del vencimiento
					</p>
				</div>
			</div>

			<div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60'>
				<div className='flex items-center justify-between gap-3'>
					<span className='inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400'>
						<FaReceipt className='h-3.5 w-3.5' />
						Factura
					</span>
					<span
						className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
							isPaid
								? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
								: days < 0
									? 'bg-red-500/10 text-red-700 dark:bg-red-900/50 dark:text-red-300'
									: 'bg-purple-500/10 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
						}`}
					>
						{isPaid ? 'Pagado' : dueLabel(days)}
					</span>
				</div>

				<div className='mt-4 grid grid-cols-2 gap-3'>
					<div>
						<p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
							Vencimiento
						</p>
						<p className='mt-1 text-sm font-bold text-slate-900 dark:text-white'>
							{formatDueDate(notification.dueDate)}
						</p>
					</div>
					<div>
						<p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
							Monto
						</p>
						<p className='mt-1 text-sm font-bold text-slate-900 dark:text-white'>
							{money(notification.amount) || 'Sin monto'}
						</p>
					</div>
					<div className='col-span-2'>
						<p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
							Categoría
						</p>
						<p className='mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200'>
							{notification.category || 'Transacción'}
						</p>
					</div>
				</div>

				{isPaid && notification.paidAt && (
					<div className='mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5'>
						<p className='text-xs font-semibold text-emerald-700 dark:text-emerald-300'>
							Pago registrado
						</p>
						<p className='mt-0.5 text-xs text-slate-500 dark:text-slate-400'>
							{timestampToDate(notification.paidAt)?.toLocaleString('es-AR') || 'Fecha guardada'}
						</p>
					</div>
				)}
			</div>

			<div className='mt-3 grid gap-2'>
				<button
					type='button'
					disabled={isSaving}
					onClick={() => onPaymentChange(notification, !isPaid)}
					className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-slate-900 ${
						isPaid
							? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
							: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 focus-visible:ring-emerald-500'
					}`}
				>
					{isSaving ? (
						<span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
					) : (
						<FaCheck className='h-3.5 w-3.5' />
					)}
					{isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
				</button>

				<button
					type='button'
					onClick={onOpenTransaction}
					className='w-full rounded-xl px-4 py-2.5 text-sm font-bold text-purple-600 transition hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-purple-300 dark:hover:bg-purple-500/10'
				>
					Ver transacción
				</button>
			</div>
		</div>
	);
};

const NotificationDropdown = () => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [subscriptionNoticeRead, setSubscriptionNoticeRead] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [notificationsLoading, setNotificationsLoading] = useState(true);
	const [notificationsError, setNotificationsError] = useState(false);
	const [selectedNotification, setSelectedNotification] = useState(null);
	const [savingPaymentId, setSavingPaymentId] = useState('');
	const selectedNotificationId = selectedNotification?.id;
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
						item.status !== 'paid' &&
						item.status !== 'dismissed' &&
						isVisibleReminder(item.dueDate, item.leadDays ?? 5)
				)
				.sort((a, b) => a.days - b.days),
		[notifications]
	);

	const paidReminders = useMemo(() => {
		const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
		return notifications
			.filter((item) => {
				if (item.status !== 'paid') return false;
				const paidAt = timestampToDate(item.paidAt);
				return paidAt && paidAt.getTime() >= cutoff;
			})
			.sort((a, b) => {
				const aPaid = timestampToDate(a.paidAt)?.getTime() || 0;
				const bPaid = timestampToDate(b.paidAt)?.getTime() || 0;
				return bPaid - aPaid;
			})
			.slice(0, 5);
	}, [notifications]);

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
		if (!selectedNotificationId) return;
		const updated = notifications.find((item) => item.id === selectedNotificationId);
		if (updated) setSelectedNotification(updated);
	}, [notifications, selectedNotificationId]);

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false);
				setSelectedNotification(null);
			}
		};

		const handleEscape = (event) => {
			if (event.key === 'Escape') {
				if (selectedNotification) {
					setSelectedNotification(null);
				} else {
					setShowDropdown(false);
				}
			}
		};

		document.addEventListener('pointerdown', handleOutsideClick);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('pointerdown', handleOutsideClick);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [selectedNotification]);

	const handleDropdownToggle = () => {
		setShowDropdown((value) => {
			const next = !value;
			if (!next) setSelectedNotification(null);
			return next;
		});
		if (hasSubscriptionNotice) setSubscriptionNoticeRead(true);
	};

	const openReminder = async (notification) => {
		setSelectedNotification(notification);
		if (notification.readAt || !user?.uid) return;
		try {
			await markNotificationRead(user.uid, notification.id);
		} catch (error) {
			console.error('Could not mark notification as read', error);
		}
	};

	const handlePaymentChange = async (notification, isPaid) => {
		if (!user?.uid || savingPaymentId) return;
		setSavingPaymentId(notification.id);

		try {
			await setNotificationPaymentState(
				user.uid,
				notification.id,
				notification.dueDate,
				isPaid
			);
			toast.success(
				isPaid
					? 'Pago registrado. El vencimiento quedó marcado como pagado.'
					: 'El vencimiento volvió a estado pendiente.'
			);
		} catch (error) {
			console.error('Could not update payment status', error);
			toast.error('No se pudo guardar el estado de pago.');
		} finally {
			setSavingPaymentId('');
		}
	};

	const openTransaction = () => {
		const transactionId =
			selectedNotification?.sourceId || selectedNotification?.id || '';

		setShowDropdown(false);
		setSelectedNotification(null);
		navigate('/transacciones', {
			state: transactionId
				? { transactionId, openEditor: true }
				: undefined,
		});
	};

	const renderReminderGroup = (label, items) => {
		if (!items.length) return null;
		return (
			<div className='mt-3'>
				<p className='px-1 pb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400'>
					{label}
				</p>
				<div className='space-y-2'>
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
				className='relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-slate-200 dark:hover:bg-slate-800'
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
					<span className='absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white'>
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				)}
			</button>

			{showDropdown && (
				<div
					className='fixed left-3 right-3 top-[4.75rem] z-[100] max-h-[72dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96'
					role='menu'
					aria-label='Notificaciones'
				>
					{selectedNotification ? (
						<NotificationDetail
							notification={selectedNotification}
							onBack={() => setSelectedNotification(null)}
							onPaymentChange={handlePaymentChange}
							isSaving={savingPaymentId === selectedNotification.id}
							onOpenTransaction={openTransaction}
						/>
					) : (
						<>
							<div className='flex items-start justify-between gap-4 px-1 pb-2 pt-1'>
								<div className='min-w-0'>
									<p className='text-base font-extrabold text-slate-900 dark:text-white'>
										Notificaciones
									</p>
									<p className='mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
										Vencimientos próximos y hasta 10 días posteriores.
									</p>
								</div>
								{activeReminders.length > 0 && (
									<span className='shrink-0 whitespace-nowrap rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] font-extrabold text-purple-700 dark:text-purple-300'>
										{activeReminders.length} activos
									</span>
								)}
							</div>

							{notificationsLoading ? (
								<div className='space-y-2 py-2'>
									<div className='h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800' />
									<div className='h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800' />
								</div>
							) : notificationsError ? (
								<div className='my-2 rounded-2xl border border-amber-300/50 bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'>
									No pudimos cargar los recordatorios. Revisá los permisos de Firestore para <strong>users/&#123;uid&#125;/notifications</strong>.
								</div>
							) : (
								<>
									{renderReminderGroup('Vencidos', overdue)}
									{renderReminderGroup('Vence hoy', today)}
									{renderReminderGroup('Próximos', upcoming)}
									{renderReminderGroup('Pagadas recientemente', paidReminders)}
									{activeReminders.length === 0 && paidReminders.length === 0 && (
										<div className='my-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center dark:border-slate-700 dark:bg-slate-800/50'>
											<FaCheckCircle className='mx-auto h-5 w-5 text-emerald-500' />
											<p className='mt-2 text-sm font-bold text-slate-700 dark:text-slate-200'>
												No hay vencimientos pendientes
											</p>
											<p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
												Los próximos aparecerán dentro de su ventana de aviso.
											</p>
										</div>
									)}
								</>
							)}

							{hasSubscriptionNotice && (
								<div className='mt-3 border-t border-slate-200 pt-2 dark:border-slate-700'>
									<button
										type='button'
										className='flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:bg-slate-800'
										role='menuitem'
										onClick={() => {
											setShowDropdown(false);
											navigate('/subscripcion');
										}}
									>
										<span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'>
											<RiAdvertisementLine />
										</span>
										<span className='min-w-0'>
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
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default NotificationDropdown;
