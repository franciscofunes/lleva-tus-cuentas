import React, { useEffect, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { FaRobot } from 'react-icons/fa';
import { RiAdvertisementLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getPaymentDataAction } from '../actionCreators/databaseActions';

const NotificationDropdown = () => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [notifications, setNotifications] = useState(['Elimina la publicidad']);
	const [notificationRead, setNotificationRead] = useState(false);
	const paymentData = useSelector((state) => state.database.paymentData);
	const user = useSelector((state) => state.auth.user);
	const dispatch = useDispatch();

	const dropdownRef = useRef(null);
	const navigate = useNavigate();
	const timeoutRef = useRef(null); // Use a ref to store the timeout ID

	const handleDropdownToggle = () => {
		setShowDropdown(!showDropdown);
		if (!notificationRead) {
			setNotificationRead(true);
			setNotifications([]);

			// Clear the previous timeout (if any)
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Set a new timeout to reset notificationRead
			timeoutRef.current = setTimeout(() => {
				setNotificationRead(false);
			}, 5000);
		}
	};

	useEffect(() => {
		if (user) {
			dispatch(getPaymentDataAction(user.uid));
		}
	}, [dispatch, user]);

	const handleHideDropdown = (event) => {
		if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
			setShowDropdown(false);
		}
	};

	useEffect(() => {
		document.addEventListener('click', handleHideDropdown);

		return () => {
			document.removeEventListener('click', handleHideDropdown);

			// Clear the timeout when the component unmounts
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const handleSuscribirClick = () => {
		let path = !paymentData ? `subscripcion` : `/transacciones`;
		navigate(path);
		setShowDropdown(false);
	};

	return (
		<div className='relative inline-block text-left' ref={dropdownRef}>
			<div>
				<button
					type='button'
					className='flex items-center focus:outline-none'
					onClick={handleDropdownToggle}
				>
					<div className='relative'>
						<FaBell className='text-xl text-gray-600 dark:text-white' />
						{notifications.length > 0 && (
							<div
								className={`absolute -top-1/2 left-full transform -translate-y-1/2 -ml-2 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs ${
									notificationRead ? 'hidden' : 'animate-pulse'
								}`}
							>
								{notifications.length}
							</div>
						)}
					</div>
				</button>
			</div>
			{showDropdown && (
				<div className='origin-top-right absolute -right-12 mt-4 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50'>
					<div
						className='p-1'
						role='menu'
						aria-orientation='vertical'
						aria-labelledby='options-menu'
					>
						<button
							className='block px-4 py-2 flex items-center text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
							role='menuitem'
							onClick={handleSuscribirClick}
							style={{ minWidth: '100px' }}
						>
							{paymentData ? 'Conoce a LITA' : 'Eliminar publicidad'}
							{paymentData ? (
								<FaRobot className='ml-2 text-lg' />
							) : (
								<RiAdvertisementLine className='ml-2 text-lg' />
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationDropdown;
