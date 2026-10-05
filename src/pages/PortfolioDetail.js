import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { subscribePortfolioPositions, subscribePortfolioSnapshots } from '../services/portfolioService';
import AppFooter from '../components/AppFooter';

const money = (value, currency = 'USD') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0));
const asDate = (value) => value?.toDate ? value.toDate() : new Date(value);
const startOf = (date, mode) => {
	const d = new Date(date);
	if (mode === 'day') d.setHours(0,0,0,0);
	if (mode === 'week') { const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); }
	if (mode === 'month') { d.setDate(1); d.setHours(0,0,0,0); }
	return d;
};
const aggregate = (rows, mode) => Object.values(rows.reduce((acc,row) => {
	const date=startOf(asDate(row.capturedAt),mode); const key=date.toISOString();
	if(!acc[key]) acc[key]={date, earning:0, expected:0, checks:0};
	acc[key].earning += Number(row.observedEarning || 0); acc[key].expected += Number(row.expectedEarning || 0); acc[key].checks += 1; return acc;
},{})).sort((a,b)=>a.date-b.date);

export default function PortfolioDetail() {
	const { positionId } = useParams();
	const user = useSelector((state) => state.auth.user);
	const [positions,setPositions]=useState([]); const [snapshots,setSnapshots]=useState([]); const [mode,setMode]=useState('day');
	useEffect(() => { if(!user) return; const a=subscribePortfolioPositions(user.uid,setPositions,console.error); const b=subscribePortfolioSnapshots(user.uid,setSnapshots,console.error); return()=>{a();b();}; },[user]);
	const position=positions.find((item)=>item.id===positionId);
	const history=useMemo(()=>snapshots.filter((item)=>item.positionId===positionId),[snapshots,positionId]);
	const grouped=useMemo(()=>aggregate(history,mode),[history,mode]);
	const total=history.reduce((sum,item)=>sum+Number(item.observedEarning||0),0);
	if(user===null) return <Navigate to='/' />;
	if(!position) return <main className='min-h-screen dark:bg-gray-900 p-6 dark:text-white'><Link to='/portfolio'>← Portfolio</Link><p className='mt-6 text-gray-500'>Cargando posición…</p></main>;
	return <>
		<main className='min-h-screen bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-white px-4 py-6'>
			<div className='max-w-5xl mx-auto'>
				<Link to='/portfolio' className='text-purple-500 font-semibold'>← Volver al Portfolio</Link>
				<section className='mt-5 rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-800 p-5'>
					<p className='uppercase text-sm font-bold text-purple-500'>{position.institution}</p>
					<h1 className='text-3xl font-bold mt-1'>{position.name}</h1>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-5'>
						<div><p className='text-xs text-gray-500'>Saldo</p><p className='text-xl font-bold'>{money(position.balance,position.currency)}</p></div>
						<div><p className='text-xs text-gray-500'>Rendimiento cargado</p><p className='text-xl font-bold text-green-500'>{Number(position.annualRate||0).toFixed(2)}%</p></div>
						<div><p className='text-xs text-gray-500'>Cambio observado</p><p className='text-xl font-bold'>{money(total,position.currency)}</p></div>
						<div><p className='text-xs text-gray-500'>Verificaciones</p><p className='text-xl font-bold'>{history.length}</p></div>
					</div>
				</section>
				<section className='mt-5 rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-800 p-5'>
					<div className='flex flex-wrap items-center justify-between gap-3'><div><h2 className='text-xl font-bold'>Ganancias observadas</h2><p className='text-sm text-gray-500'>Historial construido con las verificaciones de saldo.</p></div>
					<div className='flex gap-2'>{['day','week','month'].map((item)=><button key={item} onClick={()=>setMode(item)} className={`px-3 py-2 rounded-lg text-sm font-semibold ${mode===item?'bg-purple-600 text-white':'border dark:border-slate-600'}`}>{item==='day'?'Día':item==='week'?'Semana':'Mes'}</button>)}</div></div>
					<div className='mt-5 space-y-3'>{grouped.length===0?<p className='text-gray-500'>Todavía no hay verificaciones para graficar.</p>:grouped.map((row)=>{const max=Math.max(...grouped.map(x=>Math.abs(x.earning)),1);return <div key={row.date.toISOString()}><div className='flex justify-between text-sm'><span>{row.date.toLocaleDateString('es-AR')}</span><strong className={row.earning>=0?'text-green-500':'text-red-500'}>{money(row.earning,position.currency)}</strong></div><div className='h-2 rounded bg-slate-200 dark:bg-slate-700 mt-1 overflow-hidden'><div className='h-full bg-purple-500' style={{width:`${Math.min(100,Math.abs(row.earning)/max*100)}%`}} /></div><p className='text-xs text-gray-500 mt-1'>{row.checks} verificación(es) · esperado {money(row.expected,position.currency)}</p></div>})}</div>
				</section>
				<section className='mt-5 rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-800 p-5'>
					<h2 className='text-xl font-bold'>Historial de verificaciones</h2>
					<div className='mt-4 overflow-x-auto'><table className='w-full text-sm'><thead><tr className='text-left text-gray-500'><th className='py-2'>Fecha</th><th>Saldo</th><th>Cambio</th><th>Esperado</th></tr></thead><tbody>{[...history].reverse().map(row=><tr key={row.id} className='border-t dark:border-slate-700'><td className='py-3'>{asDate(row.capturedAt).toLocaleString('es-AR')}</td><td>{money(row.balance,position.currency)}</td><td>{money(row.observedEarning,position.currency)}</td><td>{money(row.expectedEarning,position.currency)}</td></tr>)}</tbody></table></div>
				</section>
				<p className='mt-4 text-xs text-amber-600 dark:text-amber-400'>Importante: por ahora “cambio observado” es diferencia de saldo. No se considera rendimiento confirmado hasta separar aportes, retiros y ajustes.</p>
			</div>
		</main><AppFooter />
	</>;
}
