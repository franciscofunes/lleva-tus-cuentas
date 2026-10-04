import React from 'react';
import { Link } from 'react-router-dom';

export default function AppFooter() {
	return <footer className='border-t border-slate-200 dark:border-slate-800 bg-zinc-100 dark:bg-slate-950/50'><div className='max-w-7xl mx-auto px-4 py-7 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'><div><p className='font-extrabold text-slate-900 dark:text-white'>Lleva Tus Cuentas</p><p className='text-sm text-slate-500 dark:text-slate-400'>Tus finanzas, en un solo lugar.</p></div><nav aria-label='Accesos del pie' className='flex gap-4 text-sm font-semibold'><Link to='/portfolio' className='text-slate-600 dark:text-slate-300 hover:text-purple-500'>Portfolio</Link><Link to='/transacciones' className='text-slate-600 dark:text-slate-300 hover:text-purple-500'>Transacciones</Link></nav></div></footer>;
}
