import React, { useEffect, useRef, useState } from 'react';
import { MdOutlineExitToApp } from 'react-icons/md';
import { RiLockPasswordFill } from 'react-icons/ri';
import { AiOutlineUser, AiOutlineFund, AiOutlineUnorderedList } from 'react-icons/ai';
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
				<div className='origin-top-right fixed sm:absolute right-3 sm:right-0 top-[5.25rem] sm:top-auto mt-0 sm:mt-2 w-56 sm:w-52 rounded-xl shadow-xl bg-white ring-1 ring-black/10 focus:outline-none z-[100]'>
					<div
						className='p-1'
						role='menu'
						aria-orientation='vertical'
						aria-labelledby='options-menu'
					>
						<Link
							className='px-3 py-2.5 flex items-center justify-between gap-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer whitespace-nowrap'
							role='menuitem'
							to='/transacciones'
							onClick={handleDropdownToggleChangePassword}
							
						>
							Transacciones <AiOutlineUnorderedList className='ml-2 text-base' />
						</Link>
						<Link
							className='px-3 py-2.5 flex items-center justify-between gap-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer whitespace-nowrap'
							role='menuitem'
							to='/portfolio'
							onClick={handleDropdownToggleChangePassword}
							
						>
							Portfolio <AiOutlineFund className='ml-2 text-base' />
						</Link>
						<Link
							className='px-3 py-2.5 flex items-center justify-between gap-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer whitespace-nowrap'
							role='menuitem'
							to='/subscripcion'
							onClick={handleDropdownToggleChangePassword}
							
						>
							subscripción <AiOutlineUser className='ml-2 text-base' />
						</Link>
						<Link
							className='px-3 py-2.5 flex items-center justify-between gap-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer whitespace-nowrap'
							role='menuitem'
							to='/recupero'
							onClick={handleDropdownToggleChangePassword}
							
						>
							Cambiar contraseña{' '}
							<RiLockPasswordFill className='ml-2 text-base' />
						</Link>
						<div
							className='px-3 py-2.5 flex items-center justify-between gap-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer whitespace-nowrap'
							role='menuitem'
							onClick={handleLogout}
							
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
