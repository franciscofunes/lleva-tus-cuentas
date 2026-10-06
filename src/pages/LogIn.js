import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router';
import { Link } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { logInAction } from '../actionCreators/authActions';
import AppFooter from '../components/AppFooter';
import GoogleLoginButton from '../components/GoogleLoginButton';
import bars from '../imgs/bars.svg';

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
			<div className='min-h-[calc(100dvh-6rem)] flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-900'>
				<img className='h-16 w-16' src={bars} alt='Cargando' />
			</div>
		);

	if (user) {
		return <Navigate to='/transacciones' />;
	}

	return (
		<div className='min-h-[calc(100dvh-6rem)] bg-slate-50 dark:bg-gray-900 dark:text-white flex flex-col'>
			<main className='flex-1 px-4 py-10 sm:py-14 lg:py-16'>
				<div className='mx-auto w-full max-w-md'>
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: 12 }}
						transition={{ duration: 0.4, type: 'tween' }}
						className='mb-6 text-center'
					>
						<p className='text-sm font-bold uppercase tracking-[0.2em] text-purple-500'>
							Lleva Tus Cuentas
						</p>
						<h1 className='mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white'>
							Ingresá a tu cuenta
						</h1>
						<p className='mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400'>
							Continuá con tus movimientos, balance e inversiones desde un solo lugar.
						</p>
					</motion.div>

					<motion.section
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: 18 }}
						transition={{ delay: 0.08, duration: 0.45, type: 'tween' }}
						className='rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm dark:border-slate-700 dark:bg-slate-800'
					>
						<form className='space-y-5' onSubmit={handleSubmit(onSubmit)}>
							<div>
								<label htmlFor='email' className='block text-sm font-bold text-slate-700 dark:text-slate-200'>
									Correo electrónico
								</label>
								<input
									id='email'
									className='mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white'
									type='email'
									autoComplete='email'
									{...register('email', {
										required: true,
										pattern: /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[A-Za-z]+$/,
										onChange: (event) => setEmail(event.target.value),
									})}
									placeholder='tu@email.com'
								/>
								{errors.email && (
									<p className='mt-1.5 text-sm text-red-500'>Ingresá un correo electrónico válido.</p>
								)}
							</div>

							<div>
								<div className='flex items-center justify-between gap-3'>
									<label htmlFor='password' className='block text-sm font-bold text-slate-700 dark:text-slate-200'>
										Contraseña
									</label>
									<Link to='/recupero' className='text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400'>
										¿La olvidaste?
									</Link>
								</div>
								<input
									id='password'
									className='mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white'
									type='password'
									autoComplete='current-password'
									{...register('password', {
										onChange: (event) => setPassword(event.target.value),
										required: true,
									})}
									placeholder='Ingresá tu contraseña'
								/>
								{errors.password && (
									<p className='mt-1.5 text-sm text-red-500'>Ingresá tu contraseña.</p>
								)}
							</div>

							<button
								type='submit'
								className='w-full rounded-xl bg-purple-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800'
							>
								Ingresar
							</button>
						</form>

						<div className='my-5 flex items-center gap-3' aria-hidden='true'>
							<div className='h-px flex-1 bg-slate-200 dark:bg-slate-700' />
							<span className='text-xs font-semibold uppercase tracking-wide text-slate-400'>o</span>
							<div className='h-px flex-1 bg-slate-200 dark:bg-slate-700' />
						</div>

						<GoogleLoginButton />

						<p className='mt-6 text-center text-sm text-slate-500 dark:text-slate-400'>
							¿Todavía no tenés cuenta?{' '}
							<Link className='font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400' to='/registrarse'>
								Registrarme
							</Link>
						</p>
					</motion.section>
				</div>
			</main>

			<AppFooter />
		</div>
	);
}

export default Login;
