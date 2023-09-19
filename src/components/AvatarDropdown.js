import React, { useEffect, useRef, useState } from 'react';
import { MdOutlineExitToApp } from 'react-icons/md';
import { RiLockPasswordFill } from 'react-icons/ri';
import { Link } from 'react-router-dom';

const AvatarDropdown = ({ user, handleLogout }) => {
	const [showDropdown, setShowDropdown] = useState(false);
	const dropdownRef = useRef(null);

	const handleDropdownToggle = () => {
		setShowDropdown(!showDropdown);
	};

	const handleHideDropdown = (event) => {
		if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
			setShowDropdown(false);
		}
	};

	const handleDropdownToggleChangePassword = () => {
		setShowDropdown(false);
	};

	useEffect(() => {
		document.addEventListener('click', handleHideDropdown);

		return () => {
			document.removeEventListener('click', handleHideDropdown);
		};
	}, []);

	return (
		<div className='relative inline-block text-left' ref={dropdownRef}>
			<div>
				<button
					type='button'
					className='flex items-center focus:outline-none'
					onClick={handleDropdownToggle}
				>
					<img
						className='w-10 h-10 rounded-full object-cover'
						src={user?.providerData[0]?.photoURL}
						alt='Avatar'
					/>
				</button>
			</div>
			{showDropdown && (
				<div className='origin-top-right absolute right-0 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50'>
					<div
						className='p-1'
						role='menu'
						aria-orientation='vertical'
						aria-labelledby='options-menu'
					>
						<Link
							className='block px-4 py-2 flex items-center text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
							role='menuitem'
							to='/recupero'
							onClick={handleDropdownToggleChangePassword}
							style={{ minWidth: '100px' }}
						>
							Cambiar contraseña{' '}
							<RiLockPasswordFill className='ml-2 text-base' />
						</Link>
						<div
							className='block px-4 py-2 flex items-center text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
							role='menuitem'
							onClick={handleLogout}
							style={{ minWidth: '100px' }}
						>
							Salir <MdOutlineExitToApp className='ml-2 text-base' />
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default AvatarDropdown;
