import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { signUpAction } from '../actionCreators/authActions';
import GoogleLoginButton from '../components/GoogleLoginButton';
import wallet from '../imgs/wallet.png';
import wallet2 from '../imgs/wallet2.png';
import wavesFooter from '../imgs/waves.svg';

function SignUp({ history }) {
	const dispatch = useDispatch();
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const user = useSelector((state) => state.auth.user);
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm();

	const onSubmit = () => {
		dispatch(signUpAction({ email, password, username }));
	};

	if (user) {
		navigate('/ingresar');
	}

	return (
		<>
			<motion.img
				animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
				initial={{ opacity: 0, x: -100, y: 50, scale: 2 }}
				transition={{ delay: 0.8, duration: 1, type: 'spring' }}
				src={wallet}
				alt='safe'
				className='lg:h-52 lg:w-52 h-32 w-32 z-10 mt-8 top-3/4 absolute lg:top-1/2 lg:right-28 right-5'
			/>
			<motion.img
				animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
				initial={{ opacity: 0, x: 100, y: 50, scale: 2 }}
				transition={{ delay: 0.8, duration: 1, type: 'spring' }}
				src={wallet2}
				alt='safe'
				className='lg:h-52 lg:w-52 h-32 w-32 z-10 mt-8 absolute lg:top-1/2 top-3/4 lg:left-28 left-5'
			/>
			<motion.div
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ duration: 0.5, type: 'tween' }}
				className='dark:bg-gray-900 mt-6'
			>
				<div className='container flex flex-col justify-center h-hero mx-auto items-center'>
					<motion.h1
						animate={{ opacity: 1, x: 0 }}
						initial={{ opacity: 0, x: 100 }}
						transition={{ duration: 1, type: 'tween' }}
						className='font-Roboto font-semibold text-center text-gray-600 z-50 lg:text-2xl text-1xl mb-6  italic dark:text-white'
					>
						¡Descubre una experiencia financiera innovadora y cómoda!
					</motion.h1>
					<motion.div
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ delay: 0.2, duration: 1 }}
						className='bg-white z-50 lg:w-96 w-80 pt-10 pb-8 mb-20 px-10 shadow-2xl rounded-lg dark:bg-slate-800 mb-2'
					>
						<form className='mb-0 space-y-6 ' onSubmit={handleSubmit(onSubmit)}>
							<div>
								<div className='mb-2'>
									<label
										htmlFor='username'
										className='block text-sm font-medium text-gray-700 dark:text-white'
									>
										Usuario
									</label>
									<div className='mt-1'>
										<input
											className='w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1'
											type='text'
											{...register('username', {
												required: true,
												pattern: /^[a-z0-9_-].{3,15}$/,
												onChange: (e) => {
													setUsername(e.target.value);
												},
											})}
											placeholder='Ingrese su nombre de usuario'
											autoComplete='on'
										/>
										{errors.username && (
											<p className='text-red-500 text-sm mb-1'>
												Ingrese un nombre de usuario válido
											</p>
										)}
									</div>
								</div>
								<div className='mb-2'>
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
										autoComplete='on'
									/>
									{errors.email && (
										<p className='text-red-500 text-sm mb-1'>
											Ingrese un correo electrónico válido
										</p>
									)}
								</div>
								<label
									htmlFor='password'
									className='block text-sm font-medium text-gray-700 dark:text-white'
								>
									Contraseña
								</label>
								<div className='mt-1'>
									<input
										className='w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1'
										type='password'
										{...register('password', {
											onChange: (e) => {
												setPassword(e.target.value);
											},
											required: true,
											pattern: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,32}$/,
										})}
										placeholder='Ingrese su contraseña'
										autoComplete='on'
									/>
									{errors.password && (
										<p className='flex flex-col text-red-500 text-sm'>
											Ingrese su password correctamente
											<small>
												(mínimo 8 carácteres, una mayúscula y un número)
											</small>
										</p>
									)}
								</div>
							</div>
							<div>
								<button
									type='submit'
									className='w-full flex justify-center py-3 px-4 border border-transparent shadow-sm bg-primary hover:opacity-80 font-Roboto font-medium text-white text-center text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md'
								>
									Registrarme
								</button>
							</div>
						</form>
						<GoogleLoginButton />
						<div className='flex justify-center mt-5 italic text-sm'>
							<p className='dark:text-white'> Ya tengo usuario</p>
							<Link
								className='ml-1 dark:text-white hover:text-indigo-200 underline'
								to='/ingresar'
							>
								Ingresar
							</Link>
						</div>
					</motion.div>
				</div>
			</motion.div>
			<div className='absolute bottom-0 left-0 w-full'>
				<img src={wavesFooter} alt='purple waves footer' className='w-full' />
			</div>
		</>
	);
}

export default SignUp;
