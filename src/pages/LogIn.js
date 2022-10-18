import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router';
import { Link } from 'react-router-dom';
import { logInAction } from '../actionCreators/authActions';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { resetPassword } from '../config/firebase.config';
import bars from '../imgs/bars.svg';
import money from '../imgs/money.png';
import money2 from '../imgs/money2.png';

function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const dispatch = useDispatch();
	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);

	const handleSubmit = (e) => {
		e.preventDefault();
		dispatch(logInAction({ email, password }));
		setEmail('');
		setPassword('');
	};

	if (isFetching)
		return (
			<div className='h-screen flex flex-col items-center justify-center'>
				<img className='h-20 w-20' src={bars} alt='loader' />
			</div>
		);

	if (user) {
		return <Navigate to='/transacciones'></Navigate>;
	}

	return (
		<>
			<motion.img
				animate={{ opacity: 1, rotate: 350 }}
				initial={{ opacity: 0, rotate: 0 }}
				transition={{ delay: 1, duration: 2, type: 'spring' }}
				src={money}
				alt='money'
				className='lg:h-52 lg:w-52 h-30 w-30 z-10 mb-3 absolute lg:top-1/2 top-3/4 lg:left-28 left-5 '
			/>
			<motion.img
				animate={{ opacity: 1, rotate: 10 }}
				initial={{ opacity: 0, rotate: 360 }}
				transition={{ delay: 1, duration: 2, type: 'spring' }}
				src={money2}
				alt='money'
				className='lg:h-52 lg:w-52 h-30 w-30 z-10 mb-3 top-3/4 absolute lg:top-1/2 lg:right-28 right-5 '
			/>
			<motion.div
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ duration: 0.5, type: 'tween' }}
				className='dark:bg-gray-900'
			>
				<div className='z-50 container flex flex-col justify-center h-hero mx-auto items-center'>
					<motion.h1
						animate={{
							x: 0,
							opacity: 1,
						}}
						initial={{ x: -100, opacity: 0 }}
						transition={{ duration: 1, type: 'tween' }}
						className='font-Roboto font-semibold text-center text-gray-600 z-50 lg:text-3xl text-1xl mb-6 italic dark:text-white'
					>
						Una nueva forma de gestionar tu dinero
					</motion.h1>
					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ delay: 0.2, duration: 1 }}
						className='bg-white z-50 lg:w-96 w-80 pt-10 pb-8 px-10 shadow-2xl mb-20 rounded-lg dark:bg-slate-800'
					>
						<form className='mb-0 space-y-6' onSubmit={handleSubmit}>
							<div>
								<div className='mb-2'>
									<label
										htmlFor='email'
										className='block text-sm font-medium text-gray-700 dark:text-white'
									>
										Correo electrónico
									</label>
									<div className='mt-1'>
										<input
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											type='email'
											id='email'
											autoComplete='on'
											placeholder='johndoe@gmail.com'
											required
											className='w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1'
										/>
									</div>
								</div>
								<label
									htmlFor='password'
									className='block text-sm font-medium text-gray-700 dark:text-white'
								>
									Contraseña
								</label>
								<div className='mt-1'>
									<input
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										type='password'
										autoComplete='on'
										id='password'
										required
										className='w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1'
									/>
								</div>
							</div>
							<div>
								<button
									type='submit'
									className='w-full flex justify-center py-2 px-2 border border-transparent shadow-sm bg-primary hover:opacity-95 font-Roboto font-medium text-white text-center text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md '
								>
									Ingresar
								</button>
							</div>
						</form>
						<div className='flex justify-center gap-y-2 dark:text-white mb-2 mt-3 text-sm hover:text-indigo-200'>
							<Link className='italic underline' to='/registrarse'>
								Registrarme
							</Link>
							<span className='mr-2 ml-2'>&#124;</span>
							<Link className='italic underline' to='/recupero'>
								Olvidé mí contraseña 
							</Link>
						</div>
						<GoogleLoginButton />
					</motion.div>
				</div>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					className='absolute bottom-0 z-0 h-60 w-100 dark:bg-gray-900'
					viewBox='10 100 2000 200'
				>
					<path
						fill='#5928E5'
						fillOpacity='1'
						d='M0,96L48,117.3C96,139,192,181,288,202.7C384,224,480,224,576,202.7C672,181,768,139,864,128C960,117,1056,139,1152,154.7C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'
					></path>
				</svg>
			</motion.div>
		</>
	);
}

export default Login;
