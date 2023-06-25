import { motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { Link } from 'react-router-dom';
import { logOutAction } from '../actionCreators/authActions';
import { auth } from '../shared/config/firebase/firebase.config';
import DarkModeToggle from './DarkModeToggle';

function Navbar() {
	const user = useSelector((state) => state.auth.user);
	const location = useLocation();
	const dispatch = useDispatch();

	const handleLogout = () => {
		dispatch(logOutAction());
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
						<Link to='/transacciones' className='nav-btn mr-3 dark:text-white'>
							Dashboard
						</Link>
					)}
					<div
						onClick={handleLogout}
						className='nav-btn cursor-pointer dark:text-white'
					>
						Salir
					</div>
				</>
			);
		} else {
			return (
				<>
					<Link
						to={
							location.pathname.includes('login') ? '/registrarse' : '/ingresar'
						}
						className='nav-btn dark:text-white'
					>
						{location.pathname.includes('login') ? 'Registrarme' : 'Ingresar'}
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
