import { motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { logOutAction } from '../actionCreators/authActions';
import { auth } from '../config/firebase.config';
import DarkModeToggle from './DarkModeToggle';

function Navbar() {
	const user = useSelector((state) => state.auth.user);
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useDispatch();

	const handleLogout = () => {
		dispatch(logOutAction());
		navigate('/');
	};

	useEffect(() => {
		auth.onAuthStateChanged((user) => {
			dispatch({
				type: 'SET_USER',
				payload: user,
			});
		});
	}, [dispatch]);
	return (
		<>
			<motion.nav
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ delay: 0.1, duration: 0.7 }}
				className='py-5 lg:px-10 px-3 flex justify-between items-center z-10 dark:bg-slate-800'
			>
				<Link
					to='/'
					className=' uppercase font-extrabold lg:text-4xl text-3xl tracking-widest font-Montserrat dark:text-white'
				>
					LTC<span className='text-green-600'>$</span>
				</Link>

				{user && (
					<div className='flex items-center'>
						{location.pathname === '/' && (
							<Link to='/dashboard' className='nav-btn mr-3 dark:text-white'>
								Dashboard
							</Link>
						)}
						<div
							onClick={handleLogout}
							className='nav-btn cursor-pointer dark:text-white'
						>
							Salir
						</div>
						<DarkModeToggle />
					</div>
				)}
				{!user && (
					<>
						<div className='flex items-center'>
							<Link
								to={location.pathname.includes('login') ? '/signup' : '/login'}
								className='nav-btn dark:text-white'
							>
								{location.pathname.includes('login')
									? 'Registrarme'
									: 'Ingresar'}
							</Link>
							<DarkModeToggle />
						</div>
					</>
				)}
			</motion.nav>
		</>
	);
}

export default Navbar;
