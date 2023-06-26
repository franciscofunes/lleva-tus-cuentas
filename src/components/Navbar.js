import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import { MdDashboardCustomize } from 'react-icons/md';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { Link } from 'react-router-dom';
import { logOutAction } from '../actionCreators/authActions';
import { auth } from '../shared/config/firebase/firebase.config';
import AvatarDropdown from './AvatarDropdown';
import DarkModeToggle from './DarkModeToggle';

function Navbar() {
	const user = useSelector((state) => state.auth.user);
	const location = useLocation();
	const dispatch = useDispatch();

	const [showDropdown, setShowDropdown] = useState(false);

	const handleLogout = () => {
		dispatch(logOutAction());
		setShowDropdown(!showDropdown);
	};

	const handleDropdownToggle = () => {
		setShowDropdown(!showDropdown);
	};

	useEffect(() => {
		auth.onAuthStateChanged((user) => {
			dispatch({
				type: 'SET_USER',
				payload: user,
			});
		});
	}, [dispatch]);

	const renderAuthLinks = () => {
		if (user) {
			return (
				<>
					{location.pathname === '/' && (
						<Link
							to='/transacciones'
							className='nav-btn flex items-center mr-3 dark:text-white'
						>
							Panel <MdDashboardCustomize className='ml-1' />
						</Link>
					)}
					<div
						onClick={handleDropdownToggle}
						className='flex items-center cursor-pointer'
					>
						<AvatarDropdown
							handleLogout={handleLogout}
							user={user}
							showDropdown={showDropdown}
							handleDropdownToggle={handleDropdownToggle}
						/>
					</div>
				</>
			);
		} else {
			return (
				<>
					<Link
						to={
							location.pathname.includes('/') ||
							location.pathname.includes('/registrarse') ||
							location.pathname.includes('/recupero')
								? '/ingresar'
								: '/registrarse'
						}
						className='nav-btn dark:text-white flex items-center'
					>
						{location.pathname.includes('ingresar') ? (
							<>
								<span className='mr-1'>Registrarme</span>
								<FiUserPlus />
							</>
						) : (
							<>
								<span className='mr-1'>Ingresar</span>
								<FiLogIn />
							</>
						)}
					</Link>
				</>
			);
		}
	};

	return (
		<>
			<motion.nav
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ delay: 0.1, duration: 0.7 }}
				className='py-5 lg:px-10 px-3 flex bg-zinc-50 justify-between items-center dark:bg-slate-800'
			>
				<Link
					to='/'
					className=' uppercase font-extrabold lg:text-4xl text-3xl tracking-widest font-Montserrat dark:text-white'
				>
					LTC<span className='text-green-600'>$</span>
				</Link>
				<div className='flex items-center'>
					{renderAuthLinks()}
					<DarkModeToggle />
				</div>
			</motion.nav>
		</>
	);
}

export default Navbar;
