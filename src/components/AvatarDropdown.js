import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getPopoverMotion, getPopoverTap } from '../shared/animations/popoverMotion';
import {
	AiOutlineFund,
	AiOutlineUnorderedList,
	AiOutlineUser,
} from 'react-icons/ai';
import { MdOutlineExitToApp } from 'react-icons/md';
import { RiLockPasswordFill } from 'react-icons/ri';
import { NavLink } from 'react-router-dom';

const itemClass = ({ isActive }) =>
	[
		'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
		isActive
			? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
			: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
	].join(' ');

const AvatarDropdown = ({ user, handleLogout }) => {
	const [showDropdown, setShowDropdown] = useState(false);
	const dropdownRef = useRef(null);
	const prefersReducedMotion = useReducedMotion();

	const closeDropdown = () => setShowDropdown(false);

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				closeDropdown();
			}
		};

		const handleEscape = (event) => {
			if (event.key === 'Escape') closeDropdown();
		};

		document.addEventListener('pointerdown', handleOutsideClick);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('pointerdown', handleOutsideClick);
			document.removeEventListener('keydown', handleEscape);
		};
	}, []);

	const photoUrl = user?.providerData?.find((provider) => provider?.photoURL)?.photoURL;
	const displayName =
		user?.displayName ||
		user?.providerData?.find((provider) => provider?.displayName)?.displayName ||
		'Mi cuenta';
	const email = user?.email || user?.providerData?.find((provider) => provider?.email)?.email;
	const initial = (displayName || email || 'U').trim().charAt(0).toUpperCase();
	const canResetPassword = user?.providerData?.some(
		(provider) => provider?.providerId === 'password'
	);

	return (
		<div className='relative inline-block text-left' ref={dropdownRef}>
			<motion.button
				whileTap={getPopoverTap(prefersReducedMotion)}
				type='button'
				className='inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
				onClick={() => setShowDropdown((value) => !value)}
				aria-haspopup='menu'
				aria-expanded={showDropdown}
				aria-label='Abrir menú de cuenta'
			>
				{photoUrl ? (
					<img
						className='h-full w-full object-cover'
						src={photoUrl}
						alt=''
						referrerPolicy='no-referrer'
					/>
				) : (
					<span aria-hidden='true'>{initial}</span>
				)}
			</motion.button>

			<AnimatePresence>
			{showDropdown && (
				<motion.div
					{...getPopoverMotion(prefersReducedMotion)}
					className='fixed right-3 top-[4.75rem] z-[100] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-72'
					role='menu'
					aria-label='Menú de cuenta'
				>
					<div className='border-b border-slate-200 px-3 py-3 dark:border-slate-700'>
						<p className='truncate text-sm font-extrabold text-slate-900 dark:text-white'>
							{displayName}
						</p>
						{email && (
							<p className='mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400'>
								{email}
							</p>
						)}
					</div>

					<div className='mt-2 space-y-1 lg:hidden'>
						<NavLink
							className={itemClass}
							role='menuitem'
							to='/transacciones'
							onClick={closeDropdown}
						>
							<span>Transacciones</span>
							<AiOutlineUnorderedList className='text-lg' />
						</NavLink>
						<NavLink
							className={itemClass}
							role='menuitem'
							to='/portfolio'
							onClick={closeDropdown}
						>
							<span>Portfolio</span>
							<AiOutlineFund className='text-lg' />
						</NavLink>
					</div>

					<div className='my-2 border-t border-slate-200 dark:border-slate-700 lg:mt-0' />

					<div className='space-y-1'>
						<NavLink
							className={itemClass}
							role='menuitem'
							to='/subscripcion'
							onClick={closeDropdown}
						>
							<span>Plan y suscripción</span>
							<AiOutlineUser className='text-lg' />
						</NavLink>

						{canResetPassword && (
							<NavLink
								className={itemClass}
								role='menuitem'
								to='/recupero'
								onClick={closeDropdown}
							>
								<span>Cambiar contraseña</span>
								<RiLockPasswordFill className='text-lg' />
							</NavLink>
						)}

						<button
							type='button'
							className='flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
							role='menuitem'
							onClick={() => {
								closeDropdown();
								handleLogout();
							}}
						>
							<span>Salir</span>
							<MdOutlineExitToApp className='text-lg' />
						</button>
					</div>
				</motion.div>
			)}
			</AnimatePresence>
		</div>
	);
};

export default AvatarDropdown;
