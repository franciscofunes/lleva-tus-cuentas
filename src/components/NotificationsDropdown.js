import React, { useEffect, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { RiAdvertisementLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [notifications, setNotifications] = useState(['Elimina la publicidad']);
	const [notificationRead, setNotificationRead] = useState(false);

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
		let path = `subscripcion`;
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
							Eliminar publicidad
							<RiAdvertisementLine className='ml-2 text-lg' />
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationDropdown;
