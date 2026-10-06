import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { resetPassword } from '../actionCreators/authActions';
import AppFooter from '../components/AppFooter';

function ForgotPassword() {
	const dispatch = useDispatch();
	const [email, setEmail] = useState('');

	const handleSubmit = (event) => {
		event.preventDefault();
		dispatch(resetPassword({ email }));
		setEmail('');
	};

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
							Recuperá tu contraseña
						</h1>
						<p className='mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400'>
							Ingresá el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
						</p>
					</motion.div>

					<motion.section
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: 18 }}
						transition={{ delay: 0.08, duration: 0.45, type: 'tween' }}
						className='rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm dark:border-slate-700 dark:bg-slate-800'
					>
						<form className='space-y-5' onSubmit={handleSubmit}>
							<div>
								<label htmlFor='email' className='block text-sm font-bold text-slate-700 dark:text-slate-200'>
									Correo electrónico
								</label>
								<input
									id='email'
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									type='email'
									autoComplete='email'
									required
									placeholder='tu@email.com'
									className='mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white'
								/>
								<p className='mt-2 text-xs text-slate-400'>
									Revisá también Spam o Correo no deseado si no encontrás el mensaje.
								</p>
							</div>

							<button
								type='submit'
								className='w-full rounded-xl bg-purple-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800'
							>
								Enviar enlace
							</button>
						</form>

						<div className='my-5 h-px bg-slate-200 dark:bg-slate-700' aria-hidden='true' />

						<div className='grid grid-cols-2 gap-3'>
							<Link
								to='/registrarse'
								className='inline-flex items-center justify-center rounded-xl border border-purple-500 px-4 py-3 text-sm font-bold text-purple-600 transition hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30'
							>
								Registrarme
							</Link>
							<Link
								to='/ingresar'
								className='inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900'
							>
								Ingresar
							</Link>
						</div>
					</motion.section>
				</div>
			</main>

			<AppFooter />
		</div>
	);
}

export default ForgotPassword;
