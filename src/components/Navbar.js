import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { auth } from '../config/firebaseConfig';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch } from 'react-redux';
import { logOutAction } from '../actionCreators/authActions';
import { motion } from 'framer-motion';

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
				className='py-5 lg:px-10 px-3 flex justify-between items-center z-10'
			>
				<Link
					to='/'
					className=' uppercase font-extrabold lg:text-4xl text-3xl tracking-widest font-Montserrat'
				>
					LTC<span className='text-green-600'>$</span>
				</Link>
				{user && (
					<div className='flex items-center'>
						{location.pathname === '/' && (
							<Link to='/dashboard' className='nav-btn mr-3'>
								Dashboard
							</Link>
						)}
						<div onClick={handleLogout} className='nav-btn cursor-pointer'>
							Salir
						</div>
					</div>
				)}
				{!user && (
					<Link
						to={
							location.pathname.includes('Ingresar')
								? '/Registrarse'
								: '/Ingresar'
						}
						className='nav-btn'
					>
						{location.pathname.includes('Ingresar')
							? 'Registrarse'
							: 'Ingresar'}
					</Link>
				)}
			</motion.nav>
		</>
	);
}

export default Navbar;
