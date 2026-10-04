import React from 'react';

export default function AppFooter() {
	return (
		<footer className='relative mt-8 overflow-hidden bg-slate-950 text-white' aria-label='Pie de página'>
			<div className='h-20 sm:h-24 pointer-events-none' aria-hidden='true'>
				<svg className='block h-full w-full' viewBox='0 0 1440 160' preserveAspectRatio='none' focusable='false'>
					<path d='M0 84C170 28 318 26 474 74C630 122 760 137 914 94C1072 50 1214 19 1440 58V160H0Z' fill='currentColor' className='text-purple-700/80' />
					<path d='M0 112C192 63 354 67 522 109C690 151 839 151 1011 110C1172 72 1302 65 1440 91V160H0Z' fill='currentColor' className='text-indigo-700/70' />
					<path d='M0 137C217 103 394 112 565 139C755 169 929 151 1091 125C1231 102 1340 105 1440 121V160H0Z' fill='currentColor' className='text-slate-900' />
				</svg>
			</div>
			<div className='bg-slate-900'>
				<div className='mx-auto max-w-7xl px-5 pt-2 pb-28 sm:pb-8 lg:px-8'>
					<p className='text-sm font-extrabold tracking-wide'>Lleva Tus Cuentas</p>
					<p className='mt-1 text-xs text-slate-400'>Tus finanzas, en un solo lugar.</p>
				</div>
			</div>
		</footer>
	);
}
