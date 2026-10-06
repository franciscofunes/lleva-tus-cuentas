import { motion } from 'framer-motion';
import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';

function Home() {
	const user = useSelector((state) => state.auth.user);
	return (
		<main className='bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-white'>
			<section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20'>
				<div className='grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center'>
					<motion.div animate={{ opacity:1, y:0 }} initial={{ opacity:0, y:20 }} transition={{ duration:0.5 }} className='max-w-2xl'>
						<p className='text-sm font-bold uppercase tracking-[0.18em] text-purple-500'>Lleva Tus Cuentas</p>
						<h1 className='mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight'>Controlá tus movimientos, inversiones y balance desde un solo lugar.</h1>
						<p className='mt-5 text-lg sm:text-xl text-slate-600 dark:text-slate-300'>Una vista clara de tus transacciones, divisas y portfolio para entender mejor dónde está tu dinero y cómo evoluciona.</p>
						<div className='mt-7 flex flex-col sm:flex-row gap-3'>
							<Link to={user ? '/ingresar' : '/registrarse'} className='inline-flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-3 font-bold text-white'>{user ? 'Abrir panel' : 'Comenzar'}</Link>
							{user && <Link to='/portfolio' className='inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 font-bold'>Ver portfolio</Link>}
						</div>
					</motion.div>
					<motion.div animate={{ opacity:1, scale:1 }} initial={{ opacity:0, scale:0.96 }} transition={{ duration:0.5, delay:0.1 }} className='rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm'>
						<div className='grid grid-cols-2 gap-3'>
							<div className='rounded-2xl bg-slate-100 dark:bg-slate-900/60 p-4'><p className='text-xs uppercase tracking-wide text-slate-500'>Movimientos</p><p className='mt-2 text-2xl font-extrabold'>Todo en orden</p></div>
							<div className='rounded-2xl bg-slate-100 dark:bg-slate-900/60 p-4'><p className='text-xs uppercase tracking-wide text-slate-500'>Portfolio</p><p className='mt-2 text-2xl font-extrabold'>En seguimiento</p></div>
						</div>
						<div className='mt-3 rounded-2xl border border-purple-200 dark:border-purple-900/60 p-4'><p className='text-sm font-bold text-purple-500'>Una sola experiencia</p><p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>Registrá transacciones, seguí rendimientos y consultá el histórico sin saltar entre herramientas.</p></div>
					</motion.div>
				</div>
			</section>
		</main>
			<AppFooter />
		</>
	);
}

export default Home;
