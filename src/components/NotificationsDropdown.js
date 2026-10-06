import React, { useEffect, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { RiAdvertisementLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getPaymentDataAction } from '../actionCreators/databaseActions';

const NotificationDropdown = () => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [notificationRead, setNotificationRead] = useState(false);
	const paymentData = useSelector((state) => state.database.paymentData);
	const isPaymentDataLoading = useSelector(
		(state) => state.database.isPaymentDataLoading
	);
	const user = useSelector((state) => state.auth.user);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const dropdownRef = useRef(null);

	const hasSubscriptionNotice = !isPaymentDataLoading && !paymentData;
	const unreadCount = hasSubscriptionNotice && !notificationRead ? 1 : 0;

	useEffect(() => {
		if (user) {
			dispatch(getPaymentDataAction(user.uid));
		}
	}, [dispatch, user]);

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
		if (hasSubscriptionNotice) setNotificationRead(true);
	};

	return (
		<div className='relative inline-block text-left' ref={dropdownRef}>
			<button
				type='button'
				className='relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-slate-200 dark:hover:bg-slate-800'
				onClick={handleDropdownToggle}
				aria-label={unreadCount ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
				aria-haspopup='menu'
				aria-expanded={showDropdown}
			>
				<FaBell className='text-lg' />
				{unreadCount > 0 && (
					<span className='absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white'>
						{unreadCount}
					</span>
				)}
			</button>

			{showDropdown && (
				<div
					className='fixed right-3 top-[4.75rem] z-[100] w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-72'
					role='menu'
					aria-label='Notificaciones'
				>
					<div className='px-3 py-2'>
						<p className='text-sm font-extrabold text-slate-900 dark:text-white'>
							Notificaciones
						</p>
					</div>

					{isPaymentDataLoading ? (
						<div className='mx-2 my-2 h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800' />
					) : hasSubscriptionNotice ? (
						<button
							type='button'
							className='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800'
							role='menuitem'
							onClick={() => {
								setShowDropdown(false);
								navigate('/subscripcion');
							}}
						>
							<span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300'>
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
					) : (
						<p className='px-3 py-4 text-sm text-slate-500 dark:text-slate-400'>
							No tenés notificaciones pendientes.
						</p>
					)}
				</div>
			)}
		</div>
	);
};

export default NotificationDropdown;
