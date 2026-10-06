import { motion } from 'framer-motion';
import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaChartLine, FaExchangeAlt, FaShieldAlt, FaWallet } from 'react-icons/fa';
import AppFooter from '../components/AppFooter';

function Home() {
	const user = useSelector((state) => state.auth.user);
	return (
		<main className='min-h-[calc(100vh-5rem)] bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-white'>
			<section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 lg:py-20'>
				<div className='grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center'>
					<motion.div animate={{ opacity:1, y:0 }} initial={{ opacity:0, y:20 }} transition={{ duration:0.5 }} className='max-w-2xl'>
						<p className='text-sm font-bold uppercase tracking-[0.18em] text-purple-500'>Lleva Tus Cuentas</p>
						<h1 className='mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight'>Tus finanzas, claras y en un solo lugar.</h1>
						<p className='mt-5 text-lg sm:text-xl text-slate-600 dark:text-slate-300'>Registrá movimientos, seguí tu balance y controlá tus inversiones desde una experiencia simple, consistente y pensada para usar todos los días.</p>
						<div className='mt-7 flex flex-col sm:flex-row gap-3'>
							<Link to={user ? '/ingresar' : '/registrarse'} className='inline-flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-3 font-bold text-white'>{user ? 'Abrir panel' : 'Comenzar'} <FaArrowRight className='ml-2' /></Link>
							{user && <Link to='/portfolio' className='inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 font-bold'>Ver portfolio</Link>}
						</div>
					</motion.div>
					<motion.div animate={{ opacity:1, scale:1 }} initial={{ opacity:0, scale:0.96 }} transition={{ duration:0.5, delay:0.1 }} className='rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm'>
						<div className='flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4'><span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300'><FaWallet /></span><div><p className='text-xs font-bold uppercase tracking-wider text-slate-500'>Panel financiero</p><p className='font-extrabold'>Lo importante, sin ruido</p></div></div>
						<div className='mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3'>
							<div className='rounded-2xl bg-slate-100 dark:bg-slate-900/60 p-4'><FaExchangeAlt className='text-purple-500' /><p className='mt-3 font-bold'>Movimientos</p><p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>Ingresos, gastos y divisas.</p></div>
							<div className='rounded-2xl bg-slate-100 dark:bg-slate-900/60 p-4'><FaChartLine className='text-purple-500' /><p className='mt-3 font-bold'>Portfolio</p><p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>Saldos y rendimientos.</p></div>
							<div className='rounded-2xl bg-slate-100 dark:bg-slate-900/60 p-4'><FaShieldAlt className='text-purple-500' /><p className='mt-3 font-bold'>Tu información</p><p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>Organizada por tu cuenta.</p></div>
						</div>
					</motion.div>
				</div>
			</section>
		</main>
			<AppFooter />
		</>
	);
}

export default Home;
