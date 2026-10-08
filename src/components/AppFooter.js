import React from 'react';

export default function AppFooter({ minimal = false }) {
	if (minimal) {
		return (
			<footer className='border-t border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300' aria-label='Pie de página'>
				<div className='mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8'>
					<p className='text-sm font-extrabold text-slate-900 dark:text-white'>LTC<span className='text-green-600'>$</span> <span className='ml-2 font-medium text-slate-500 dark:text-slate-400'>Lleva Tus Cuentas</span></p>
					<p className='text-xs text-slate-500 dark:text-slate-400'>Movimientos, inversiones e inteligencia artificial en un solo lugar.</p>
				</div>
			</footer>
		);
	}
	return (
		<footer className='relative overflow-hidden bg-white text-slate-900 dark:bg-slate-900 dark:text-white' aria-label='Pie de página'>
			<div className='h-12 sm:h-16 lg:h-20 pointer-events-none' aria-hidden='true'>
				<svg className='block h-full w-full' viewBox='0 0 1440 160' preserveAspectRatio='none' focusable='false'>
					<path d='M0 84C170 28 318 26 474 74C630 122 760 137 914 94C1072 50 1214 19 1440 58V160H0Z' fill='currentColor' className='text-purple-700/80' />
					<path d='M0 112C192 63 354 67 522 109C690 151 839 151 1011 110C1172 72 1302 65 1440 91V160H0Z' fill='currentColor' className='text-indigo-700/70' />
					<path d='M0 137C217 103 394 112 565 139C755 169 929 151 1091 125C1231 102 1340 105 1440 121V160H0Z' fill='currentColor' className='text-white dark:text-slate-900' />
				</svg>
			</div>
			<div className='bg-white dark:bg-slate-900'>
				<div className='mx-auto max-w-7xl px-5 pt-1 pb-7 sm:pb-8 lg:px-8'>
					<p className='text-sm font-extrabold tracking-wide'>Lleva Tus Cuentas</p>
					<p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>Tus finanzas, en un solo lugar.</p>
				</div>
			</div>
		</footer>
	);
}
