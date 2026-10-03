import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router';
import { Link } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { logInAction } from '../actionCreators/authActions';
import GoogleLoginButton from '../components/GoogleLoginButton';
import bars from '../imgs/bars.svg';
import money from '../imgs/money.png';
import money2 from '../imgs/money2.png';
import wavesFooter from '../imgs/waves.svg';

function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const dispatch = useDispatch();

	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);

	const onSubmit = () => {
		dispatch(logInAction({ email, password }));
	};

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm();

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
				className='lg:h-52 lg:w-52 h-25 w-25 z-10 mb-5 absolute lg:top-1/2 top-3/4 lg:left-28 left-5 '
			/>
			<motion.img
				animate={{ opacity: 1, rotate: 10 }}
				initial={{ opacity: 0, rotate: 360 }}
				transition={{ delay: 1, duration: 2, type: 'spring' }}
				src={money2}
				alt='money'
				className='lg:h-52 lg:w-52 h-25 w-25 z-10 mb-5 top-3/4 absolute lg:top-1/2 lg:right-28 right-5 '
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
						className='font-Roboto font-semibold text-center text-gray-600 z-50 lg:text-2xl text-1xl mb-6 italic dark:text-white'
					>
						Una nueva forma de administrarse
					</motion.h1>
					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ delay: 0.2, duration: 1 }}
						className='bg-white z-50 lg:w-96 w-80 pt-10 pb-8 px-10 shadow-2xl mb-10 rounded-lg dark:bg-slate-800'
					>
						<form className='mb-0 space-y-6' onSubmit={handleSubmit(onSubmit)}>
							<div>
								<label
									htmlFor='email'
									className='block text-sm font-medium text-gray-700 dark:text-white'
								>
									Correo electrónico
								</label>
								<input
									className='w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1'
									type='email'
									{...register('email', {
										required: true,
										pattern: /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[A-Za-z]+$/,
										onChange: (e) => {
											setEmail(e.target.value);
										},
									})}
									placeholder='Ingrese su correo electrónico'
								/>
								{errors.email && (
									<p className='text-red-500 text-sm mb-1'>
										Ingrese un correo electrónico válido
									</p>
								)}
								<label
									htmlFor='password'
									className='block text-sm font-medium text-gray-700 dark:text-white'
								>
									Contraseña
								</label>
								<input
									className='w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1'
									type='password'
									{...register('password', {
										onChange: (e) => {
											setPassword(e.target.value);
										},
										required: true,
										// pattern: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,32}$/,
									})}
									placeholder='Ingrese su contraseña'
								/>
								{errors.password && (
									<p className='text-red-500 text-sm mb-1'>
										Ingrese su password correctamente
									</p>
								)}
							</div>
							<button
								type='submit'
								className='w-full flex justify-center py-2 px-2 border border-transparent shadow-sm bg-primary hover:opacity-95 font-Roboto font-medium text-white text-center text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md '
							>
								Ingresar
							</button>
						</form>
						<GoogleLoginButton />
						<div className='flex justify-center dark:text-white mt-5 italic text-sm  underline'>
							<Link className='mr-2 hover:text-indigo-200' to='/registrarse'>
								Registrarme
							</Link>
							<span className=' dark:text-white  '>|</span>
							<Link className='ml-2 hover:text-indigo-300' to='/recupero'>
								Olvide mi contraseña
							</Link>
						</div>
					</motion.div>
				</div>
				<div className='absolute bottom-0 left-0 w-full'>
					<img src={wavesFooter} alt='purple waves footer' className='w-full' />
				</div>
			</motion.div>
		</>
	);
}

export default Login;
