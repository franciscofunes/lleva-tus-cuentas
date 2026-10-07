import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaChevronDown, FaCopy, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { deletePortfolioSnapshot, registerReconciliationTransaction, savePortfolioReconciliation, subscribePortfolioPositions, subscribePortfolioReconciliations, subscribePortfolioSnapshots, updatePortfolioSnapshot } from '../services/portfolioService';
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
const DetailSection = ({ id, title, subtitle, open, onToggle, children }) => (
	<section className='mt-5 rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden'>
		<button type='button' onClick={onToggle} aria-expanded={open} aria-controls={id} className='w-full p-5 flex items-center justify-between gap-4 text-left'>
			<div className='min-w-0'><h2 className='text-xl font-bold'>{title}</h2>{subtitle && <p className='text-sm text-gray-500 mt-1'>{subtitle}</p>}</div>
			<FaChevronDown className={`shrink-0 text-purple-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden='true' />
		</button>
		{open && <div id={id} className='px-5 pb-5'>{children}</div>}
	</section>
);

const aggregate = (rows, mode) => Object.values(rows.reduce((acc,row) => {
	const date=startOf(asDate(row.capturedAt),mode); const key=date.toISOString();
	if(!acc[key]) acc[key]={date, earning:0, expected:0, checks:0};
	acc[key].earning += Number(row.confirmedEarning ?? (row.changeType === 'earning' ? row.observedEarning : 0)); acc[key].expected += Number(row.expectedEarning || 0); acc[key].checks += 1; return acc;
},{})).sort((a,b)=>a.date-b.date);

export default function PortfolioDetail() {
	const { positionId } = useParams();
	const user = useSelector((state) => state.auth.user);
	const [positions,setPositions]=useState([]); const [snapshots,setSnapshots]=useState([]); const [reconciliations,setReconciliations]=useState([]); const [mode,setMode]=useState('day');
	const [editing,setEditing]=useState(null); const [deleting,setDeleting]=useState(null); const [pendingAction,setPendingAction]=useState('');
	const detailPreferenceKey = user?.uid ? `ltc:portfolio:detail:${user.uid}` : 'ltc:portfolio:detail';
	const [openSections,setOpenSections]=useState({ overview:true, earnings:true, account:true, monthly:true, history:true });
	useEffect(()=>{ if(!user) return; try { const saved=JSON.parse(localStorage.getItem(detailPreferenceKey) || '{}'); if(saved.openSections) setOpenSections((current)=>({...current,...saved.openSections})); } catch {} },[user,detailPreferenceKey]);
	useEffect(()=>{ if(!user) return; localStorage.setItem(detailPreferenceKey,JSON.stringify({openSections})); },[user,detailPreferenceKey,openSections]);
	const toggleSection=(key)=>setOpenSections((current)=>({...current,[key]:!current[key]}));
	useEffect(() => { if(!user) return; const a=subscribePortfolioPositions(user.uid,setPositions,console.error); const b=subscribePortfolioSnapshots(user.uid,setSnapshots,console.error); const c=subscribePortfolioReconciliations(user.uid,setReconciliations,console.error); return()=>{a();b();c();}; },[user]);
	const position=positions.find((item)=>item.id===positionId);
	const history=useMemo(()=>snapshots.filter((item)=>item.positionId===positionId),[snapshots,positionId]);
	const grouped=useMemo(()=>aggregate(history,mode),[history,mode]);
	const monthly=useMemo(()=>Object.values(history.reduce((acc,row)=>{ const d=asDate(row.capturedAt); const month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if(!acc[month]) acc[month]={month,rows:[],amount:0}; acc[month].rows.push(row); if(row.changeType==='earning') acc[month].amount += Number(row.confirmedEarning ?? row.observedEarning ?? 0); return acc; },{})).sort((a,b)=>b.month.localeCompare(a.month)),[history]);
	const total=history.reduce((sum,item)=>sum+Number(item.confirmedEarning ?? (item.changeType === 'earning' ? item.observedEarning : 0)),0);
	const isFci = Boolean(position && (position.category === 'FCI' || position.trackingMode === 'NAV'));
	const navHistory = useMemo(() => {
		const rows = history
			.filter((row) => Number(row.nav || 0) > 0)
			.map((row) => ({ ...row, navValue: Number(row.nav) }));
		return rows.map((row, index) => {
			const previousNav = index > 0 ? rows[index - 1].navValue : null;
			const navChangePercent = previousNav > 0
				? ((row.navValue / previousNav) - 1) * 100
				: null;
			return { ...row, previousNav, navChangePercent };
		});
	}, [history]);
	const monthLabels = { jan:'Ene', feb:'Feb', mar:'Mar', apr:'Abr', may:'May', jun:'Jun', jul:'Jul', aug:'Ago', sep:'Sep', oct:'Oct', nov:'Nov', dec:'Dic' };
	const orderedMonths = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
	const publishedMonthlyReturns = position?.monthlyReturns || {};
	const publishedMonthlyValues = orderedMonths
		.map((month) => Number(publishedMonthlyReturns[month]))
		.filter(Number.isFinite);
	const publishedSimpleTotal = publishedMonthlyValues.reduce((sum, value) => sum + value, 0);
	const publishedCompoundTotal = (publishedMonthlyValues.reduce((factor, value) => factor * (1 + value / 100), 1) - 1) * 100;
	const accountRows = position ? [['CBU',position.cbu],['Alias',position.alias],['Número de cuenta',position.accountNumber],['Routing',position.routingNumber],['SWIFT',position.swift]].filter(([,value])=>value) : [];
	const hasAccountDetails = position && (accountRows.length || position.accountHolder || position.accountType || position.bankName || position.bankAddress || position.depositInstructions);
	const registerMonth = async (saved) => { if(!saved || pendingAction || saved.transactionId) return; setPendingAction(`register-${saved.month}`); try { const result=await registerReconciliationTransaction(user.uid,saved); toast.success(result.alreadyRegistered?'Este cierre ya estaba registrado':'Rendimiento registrado en Transacciones'); } catch(error) { console.error(error); toast.error(error.message || 'No se pudo registrar el rendimiento'); } finally { setPendingAction(''); } };
	const closeMonth = async (item) => { if(pendingAction) return; setPendingAction(`month-${item.month}`); try { await savePortfolioReconciliation(user.uid, position, item.month, item.rows); toast.success('Cierre mensual guardado'); } catch(error) { console.error(error); toast.error('No se pudo guardar el cierre mensual'); } finally { setPendingAction(''); } };
	const saveVerification = async () => { if(!editing || pendingAction) return; setPendingAction('save'); try { await updatePortfolioSnapshot(user.uid, editing.id, editing); toast.success('Verificación actualizada'); setEditing(null); } catch(error) { console.error(error); toast.error('No se pudo actualizar la verificación'); } finally { setPendingAction(''); } };
	const removeVerification = async () => { if(!deleting || pendingAction) return; setPendingAction('delete'); try { await deletePortfolioSnapshot(user.uid, deleting.id); toast.success('Verificación eliminada'); setDeleting(null); } catch(error) { console.error(error); toast.error('No se pudo eliminar la verificación'); } finally { setPendingAction(''); } };
	const copyValue = async (label,value) => { try { await navigator.clipboard.writeText(String(value)); toast.success(`${label} copiado`); } catch (error) { toast.error(`No se pudo copiar ${label.toLowerCase()}`); } };
	if(user===null) return <Navigate to='/' />;
	if(!position) return <main className='min-h-screen dark:bg-gray-900 p-6 dark:text-white'><Link to='/portfolio'>← Portfolio</Link><p className='mt-6 text-gray-500'>Cargando posición…</p></main>;
	return <>
		<main className='min-h-screen bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-white px-4 py-6'>
			<div className='max-w-5xl mx-auto'>
				<Link to='/portfolio' className='text-purple-500 font-semibold'>← Volver al Portfolio</Link>
				<DetailSection id='portfolio-overview' title={`${position.institution} · ${position.name}`} subtitle='Resumen de la posición' open={openSections.overview} onToggle={()=>toggleSection('overview')}>
					<p className='uppercase text-sm font-bold text-purple-500'>{position.institution}</p>
					<h1 className='text-3xl font-bold mt-1'>{position.name}</h1>
					{isFci ? (
						<div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-5'>
							<div><p className='text-xs text-gray-500'>Valuación actual</p><p className='text-xl font-bold'>{money(position.balance,position.currency)}</p></div>
							<div><p className='text-xs text-gray-500'>Valor cuotaparte</p><p className='text-xl font-bold text-purple-500'>{Number(position.nav || 0) > 0 ? Number(position.nav).toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</p><p className='text-xs text-gray-500'>{position.navDate || 'Sin fecha NAV'}</p></div>
							<div><p className='text-xs text-gray-500'>Cuotapartes</p><p className='text-xl font-bold'>{Number(position.shares || 0) > 0 ? Number(position.shares).toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</p></div>
							<div><p className='text-xs text-gray-500'>YTD publicado</p><p className='text-xl font-bold text-green-500'>{position.publishedYtdReturn === '' || position.publishedYtdReturn == null ? '—' : `${Number(position.publishedYtdReturn).toFixed(2)}%`}</p></div>
						</div>
					) : (
						<div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-5'>
							<div><p className='text-xs text-gray-500'>Saldo</p><p className='text-xl font-bold'>{money(position.balance,position.currency)}</p></div>
							<div><p className='text-xs text-gray-500'>Rendimiento cargado</p><p className='text-xl font-bold text-green-500'>{Number(position.annualRate||0).toFixed(2)}%</p></div>
							<div><p className='text-xs text-gray-500'>Rendimiento confirmado</p><p className='text-xl font-bold'>{money(total,position.currency)}</p></div>
							<div><p className='text-xs text-gray-500'>Verificaciones</p><p className='text-xl font-bold'>{history.length}</p></div>
						</div>
					)}
				</DetailSection>
				<DetailSection
					id='portfolio-earnings'
					title={isFci ? 'Evolución de la cuotaparte' : 'Ganancias observadas'}
					subtitle={isFci ? 'Seguimiento de NAV y valuación. No se trata como ganancia realizada hasta rescatar.' : 'Historial construido con las verificaciones de saldo.'}
					open={openSections.earnings}
					onToggle={()=>toggleSection('earnings')}
				>
					{isFci ? (
						<div className='mt-4 space-y-3'>
							{navHistory.length===0 ? <p className='text-gray-500'>Todavía no hay valuaciones con valor de cuotaparte.</p> : [...navHistory].reverse().map((row) => (
								<div key={row.id} className='rounded-xl border border-slate-200 dark:border-slate-700 p-4'>
									<div className='flex items-start justify-between gap-3'>
										<div><p className='text-xs text-gray-500'>Fecha</p><p className='font-semibold'>{asDate(row.capturedAt).toLocaleDateString('es-AR')}</p></div>
										<div className='text-right'><p className='text-xs text-gray-500'>Valor cuotaparte</p><p className='font-bold text-lg'>{row.navValue.toLocaleString('es-AR',{maximumFractionDigits:6})}</p></div>
									</div>
									<div className='grid grid-cols-2 gap-3 mt-3'>
										<div><p className='text-xs text-gray-500'>Variación NAV</p><p className={`font-semibold ${row.navChangePercent == null ? 'text-gray-400' : row.navChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.navChangePercent == null ? 'Primera medición' : `${row.navChangePercent >= 0 ? '+' : ''}${row.navChangePercent.toFixed(3)}%`}</p></div>
										<div><p className='text-xs text-gray-500'>Valuación</p><p className='font-semibold'>{money(row.balance,position.currency)}</p></div>
									</div>
								</div>
							))}
						</div>
					) : (
						<>
							<div className='flex flex-wrap items-center justify-end gap-3'><div className='flex gap-2'>{['day','week','month'].map((item)=><button key={item} onClick={()=>setMode(item)} className={`px-3 py-2 rounded-lg text-sm font-semibold ${mode===item?'bg-purple-600 text-white':'border dark:border-slate-600'}`}>{item==='day'?'Día':item==='week'?'Semana':'Mes'}</button>)}</div></div>
							<div className='mt-4 space-y-3'>{grouped.length===0?<p className='text-gray-500'>Todavía no hay verificaciones para graficar.</p>:grouped.map((row)=>{const max=Math.max(...grouped.map(x=>Math.abs(x.earning)),1);return <div key={row.date.toISOString()}><div className='flex justify-between text-sm'><span>{row.date.toLocaleDateString('es-AR')}</span><strong className={row.earning>=0?'text-green-500':'text-red-500'}>{money(row.earning,position.currency)}</strong></div><div className='h-2 rounded bg-slate-200 dark:bg-slate-700 mt-1 overflow-hidden'><div className='h-full bg-purple-500' style={{width:`${Math.min(100,Math.abs(row.earning)/max*100)}%`}} /></div><p className='text-xs text-gray-500 mt-1'>{row.checks} verificación(es) · esperado {money(row.expected,position.currency)}</p></div>})}</div>
						</>
					)}
				</DetailSection>
				{hasAccountDetails && <DetailSection id='portfolio-account' title='Datos de cuenta' subtitle='Datos para recibir transferencias o fondear esta posición.' open={openSections.account} onToggle={()=>toggleSection('account')}>
					<div className='grid md:grid-cols-2 gap-3 mt-5'>
						{position.accountHolder && <div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Titular</p><p className='font-semibold mt-1'>{position.accountHolder}</p></div>}
						{position.bankName && <div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Banco receptor</p><p className='font-semibold mt-1'>{position.bankName}</p></div>}
						{position.accountType && <div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Tipo de cuenta</p><p className='font-semibold mt-1'>{position.accountType}</p></div>}
						{accountRows.map(([label,value]) => <div key={label} className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 flex items-center justify-between gap-3'><div className='min-w-0'><p className='text-xs text-gray-500'>{label}</p><p className='font-semibold mt-1 break-all'>{value}</p></div><button type='button' onClick={()=>copyValue(label,value)} title={`Copiar ${label}`} aria-label={`Copiar ${label}`} className='shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 hover:text-purple-500'><FaCopy /></button></div>)}
					</div>
					{position.bankAddress && <div className='mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Dirección del banco</p><p className='font-semibold mt-1'>{position.bankAddress}</p></div>}
					{position.depositInstructions && <div className='mt-3 rounded-xl border border-purple-200 dark:border-purple-900/60 p-3'><p className='text-xs text-gray-500'>Instrucciones</p><p className='text-sm mt-1'>{position.depositInstructions}</p></div>}
				</DetailSection>}
				<DetailSection
					id='portfolio-monthly'
					title={isFci ? 'Rendimiento publicado del fondo' : 'Cierre mensual'}
					subtitle={isFci ? 'Información porcentual publicada por el fondo. Es distinta de tu ganancia realizada.' : 'Consolida solamente verificaciones clasificadas como rendimiento. Todavía no crea una transacción.'}
					open={openSections.monthly}
					onToggle={()=>toggleSection('monthly')}
				>
					{isFci ? (
						<div className='mt-4'>
							{publishedMonthlyValues.length === 0 ? (
								<p className='text-gray-500'>Todavía no cargaste la rentabilidad mensual publicada por el fondo.</p>
							) : (
								<>
									<div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
										{orderedMonths.map((month) => {
											const value = Number(publishedMonthlyReturns[month]);
											if (!Number.isFinite(value)) return null;
											return <div key={month} className='rounded-xl border border-slate-200 dark:border-slate-700 p-3'><p className='text-xs text-gray-500'>{monthLabels[month]}</p><p className={`mt-1 font-bold ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>{value.toFixed(2)}%</p></div>;
										})}
									</div>
									<div className='grid sm:grid-cols-3 gap-2 mt-4'>
										<div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Suma simple</p><p className='font-bold'>{publishedSimpleTotal.toFixed(2)}%</p></div>
										<div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Acumulado compuesto</p><p className='font-bold text-green-500'>{publishedCompoundTotal.toFixed(2)}%</p></div>
										<div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>YTD publicado</p><p className='font-bold'>{position.publishedYtdReturn === '' || position.publishedYtdReturn == null ? '—' : `${Number(position.publishedYtdReturn).toFixed(2)}%`}</p></div>
									</div>
								</>
							)}
						</div>
					) : (
						<div className='mt-4 space-y-3'>{monthly.length===0?<p className='text-gray-500'>Todavía no hay meses para conciliar.</p>:monthly.map(item=>{const saved=reconciliations.find(r=>r.positionId===positionId&&r.month===item.month); const busy=pendingAction===`month-${item.month}`; return <div key={item.month} className='rounded-xl border dark:border-slate-700 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3'><div><p className='font-bold'>{new Date(`${item.month}-01T12:00:00`).toLocaleDateString('es-AR',{month:'long',year:'numeric'})}</p><p className='text-sm text-gray-500'>{money(item.amount,position.currency)} confirmados · {item.rows.filter(r=>r.changeType==='earning').length} rendimiento(s)</p><p className={`text-xs mt-1 ${saved?'text-green-500':'text-amber-500'}`}>{saved?.transactionId?'Registrado en Transacciones':saved?'Cierre guardado · pendiente de registrar en Transacciones':'Pendiente de cierre'}</p></div><div className='flex flex-col sm:flex-row gap-2'><button type='button' onClick={()=>closeMonth(item)} disabled={Boolean(pendingAction) || Boolean(saved?.transactionId)} className='min-w-[130px] rounded-lg border border-purple-500 text-purple-500 py-2 px-3 font-semibold disabled:opacity-50'>{busy?<span className='inline-block w-5 h-5 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin'/>:(saved?.transactionId?'Cierre registrado':saved?'Actualizar cierre':'Cerrar mes')}</button>{saved && <button type='button' onClick={()=>registerMonth(saved)} disabled={Boolean(pendingAction) || Boolean(saved.transactionId)} className='min-w-[170px] rounded-lg bg-green-600 text-white py-2 px-3 font-semibold disabled:opacity-50'>{pendingAction===`register-${item.month}`?<span className='inline-block w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin'/>:(saved.transactionId?'Registrado ✓':'Registrar en Transacciones')}</button>}</div></div>})}</div>
					)}
				</DetailSection>
				<DetailSection
					id='portfolio-history'
					title={isFci ? 'Historial de valuaciones' : 'Historial de verificaciones'}
					subtitle={isFci ? 'Cada registro representa un valor de cuotaparte observado y la valuación resultante.' : undefined}
					open={openSections.history}
					onToggle={()=>toggleSection('history')}
				>
					{isFci ? (
						<>
							<div className='mt-4 space-y-3 md:hidden'>
								{[...navHistory].reverse().map((row)=><article key={row.id} className='rounded-xl border border-slate-200 dark:border-slate-700 p-4'>
									<div className='flex items-start justify-between gap-3'>
										<div className='min-w-0'><p className='text-xs text-gray-500'>Fecha</p><p className='font-semibold text-sm mt-0.5'>{asDate(row.capturedAt).toLocaleString('es-AR')}</p></div>
										<div className='flex shrink-0 gap-2'><button type='button' onClick={()=>setEditing({...row})} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border dark:border-slate-600' aria-label='Editar valuación'><FaPencilAlt /></button><button type='button' onClick={()=>setDeleting(row)} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-400 text-red-500' aria-label='Eliminar valuación'><FaTrashAlt /></button></div>
									</div>
									<div className='grid grid-cols-2 gap-x-4 gap-y-3 mt-4'>
										<div><p className='text-xs text-gray-500'>Valor cuotaparte</p><p className='font-semibold'>{row.navValue.toLocaleString('es-AR',{maximumFractionDigits:6})}</p></div>
										<div><p className='text-xs text-gray-500'>Variación NAV</p><p className={`font-semibold ${row.navChangePercent == null ? 'text-gray-400' : row.navChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.navChangePercent == null ? 'Inicial' : `${row.navChangePercent >= 0 ? '+' : ''}${row.navChangePercent.toFixed(3)}%`}</p></div>
										<div><p className='text-xs text-gray-500'>Cuotapartes</p><p className='font-medium'>{Number(row.shares || position.shares || 0) > 0 ? Number(row.shares || position.shares).toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</p></div>
										<div><p className='text-xs text-gray-500'>Valuación</p><p className='font-medium whitespace-nowrap'>{money(row.balance,position.currency)}</p></div>
									</div>
									{row.note && <p className='mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-gray-500 break-words'>{row.note}</p>}
								</article>)}
								{navHistory.length===0 && <p className='text-gray-500'>Todavía no hay valuaciones NAV guardadas.</p>}
							</div>
							<div className='mt-4 hidden md:block overflow-x-auto'>
								<table className='w-full min-w-[760px] text-sm'>
									<thead><tr className='text-left text-gray-500'><th className='py-2 pr-4'>Fecha</th><th className='pr-4'>Cuotaparte</th><th className='pr-4'>Variación NAV</th><th className='pr-4'>Cuotapartes</th><th className='pr-4'>Valuación</th><th className='text-right'>Acciones</th></tr></thead>
									<tbody>{[...navHistory].reverse().map((row)=><tr key={row.id} className='border-t dark:border-slate-700'><td className='py-3 pr-4 whitespace-nowrap'>{asDate(row.capturedAt).toLocaleString('es-AR')}</td><td className='pr-4 whitespace-nowrap'>{row.navValue.toLocaleString('es-AR',{maximumFractionDigits:6})}</td><td className={`pr-4 whitespace-nowrap ${row.navChangePercent == null ? 'text-gray-400' : row.navChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.navChangePercent == null ? 'Inicial' : `${row.navChangePercent >= 0 ? '+' : ''}${row.navChangePercent.toFixed(3)}%`}</td><td className='pr-4 whitespace-nowrap'>{Number(row.shares || position.shares || 0) > 0 ? Number(row.shares || position.shares).toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</td><td className='pr-4 whitespace-nowrap'>{money(row.balance,position.currency)}</td><td><div className='flex justify-end gap-2'><button type='button' onClick={()=>setEditing({...row})} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border dark:border-slate-600' aria-label='Editar valuación'><FaPencilAlt /></button><button type='button' onClick={()=>setDeleting(row)} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-400 text-red-500' aria-label='Eliminar valuación'><FaTrashAlt /></button></div></td></tr>)}</tbody>
								</table>
							</div>
						</>
					) : (
						<>
							<div className='mt-4 space-y-3 md:hidden'>{[...history].reverse().map(row=><article key={row.id} className='rounded-xl border border-slate-200 dark:border-slate-700 p-4'><div className='flex items-start justify-between gap-3'><div className='min-w-0'><p className='text-xs text-gray-500'>Fecha</p><p className='font-semibold text-sm mt-0.5'>{asDate(row.capturedAt).toLocaleString('es-AR')}</p></div><div className='flex shrink-0 gap-2'><button type='button' onClick={()=>setEditing({...row})} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border dark:border-slate-600' aria-label='Editar verificación'><FaPencilAlt /></button><button type='button' onClick={()=>setDeleting(row)} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-400 text-red-500' aria-label='Eliminar verificación'><FaTrashAlt /></button></div></div><div className='grid grid-cols-2 gap-x-4 gap-y-3 mt-4'><div><p className='text-xs text-gray-500'>Saldo</p><p className='font-semibold whitespace-nowrap'>{money(row.balance,position.currency)}</p></div><div><p className='text-xs text-gray-500'>Cambio</p><p className={`font-semibold whitespace-nowrap ${Number(row.observedEarning||0)>=0?'text-green-500':'text-red-500'}`}>{money(row.observedEarning,position.currency)}</p></div><div><p className='text-xs text-gray-500'>Tipo</p><p className='font-medium'>{({earning:'Rendimiento',deposit:'Aporte',withdrawal:'Retiro',adjustment:'Ajuste',valuation:'Valuación NAV'}[row.changeType] || 'Sin clasificar')}</p></div><div><p className='text-xs text-gray-500'>Esperado</p><p className='font-medium whitespace-nowrap'>{money(row.expectedEarning,position.currency)}</p></div></div>{row.note && <p className='mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-gray-500 break-words'>{row.note}</p>}</article>)}</div>
							<div className='mt-4 hidden md:block overflow-x-auto'><table className='w-full min-w-[760px] text-sm'><thead><tr className='text-left text-gray-500'><th className='py-2 pr-4'>Fecha</th><th className='pr-4'>Saldo</th><th className='pr-4'>Cambio</th><th className='pr-4'>Tipo</th><th className='pr-4'>Esperado</th><th className='text-right'>Acciones</th></tr></thead><tbody>{[...history].reverse().map(row=><tr key={row.id} className='border-t dark:border-slate-700'><td className='py-3 pr-4 whitespace-nowrap'>{asDate(row.capturedAt).toLocaleString('es-AR')}</td><td className='pr-4 whitespace-nowrap'>{money(row.balance,position.currency)}</td><td className='pr-4 whitespace-nowrap'>{money(row.observedEarning,position.currency)}</td><td className='pr-4 whitespace-nowrap'>{({earning:'Rendimiento',deposit:'Aporte',withdrawal:'Retiro',adjustment:'Ajuste',valuation:'Valuación NAV'}[row.changeType] || 'Sin clasificar')}</td><td className='pr-4 whitespace-nowrap'>{money(row.expectedEarning,position.currency)}</td><td><div className='flex justify-end gap-2'><button type='button' onClick={()=>setEditing({...row})} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border dark:border-slate-600' aria-label='Editar verificación'><FaPencilAlt /></button><button type='button' onClick={()=>setDeleting(row)} className='w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-400 text-red-500' aria-label='Eliminar verificación'><FaTrashAlt /></button></div></td></tr>)}</tbody></table></div>
						</>
					)}
				</DetailSection>
				{editing && <div className='mt-4 rounded-xl border border-purple-400 p-4'><h3 className='font-bold'>{isFci ? 'Editar nota de valuación' : 'Editar verificación'}</h3><p className='text-sm text-gray-500 mt-1'>{isFci ? 'El NAV, las cuotapartes y la valuación quedan como evidencia histórica. Podés corregir solamente la nota.' : 'La fecha, saldo y cambio observado permanecen como evidencia. Podés corregir su clasificación y nota.'}</p>{!isFci && <select value={editing.changeType || 'unclassified'} onChange={(e)=>setEditing({...editing,changeType:e.target.value})} className='mt-3 w-full rounded-lg border p-2 bg-transparent'><option value='unclassified'>Sin clasificar</option><option value='earning'>Rendimiento</option><option value='deposit'>Aporte</option><option value='withdrawal'>Retiro</option><option value='adjustment'>Ajuste</option>{editing.changeType === 'valuation' && <option value='valuation'>Valuación NAV</option>}</select>}<textarea value={editing.note || ''} onChange={(e)=>setEditing({...editing,note:e.target.value})} className='mt-3 w-full rounded-lg border p-2 bg-transparent' placeholder='Nota' /><div className='flex gap-2 mt-3'><button type='button' onClick={()=>setEditing(null)} disabled={Boolean(pendingAction)} className='flex-1 border rounded-lg py-2'>Cancelar</button><button type='button' onClick={saveVerification} disabled={Boolean(pendingAction)} className='flex-1 bg-purple-600 text-white rounded-lg py-2 font-semibold'>{pendingAction==='save'?<span className='inline-block w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin'/>:'Guardar'}</button></div></div>}
				{deleting && <div className='mt-4 rounded-xl border border-red-400 p-4'><h3 className='font-bold'>Eliminar verificación</h3><p className='text-sm text-gray-500 mt-1'>{isFci ? 'Se quitará esta valuación NAV del historial. No genera ni elimina movimientos de Transacciones.' : 'Se quitará del historial y de los cálculos de rendimiento. Esta acción todavía no afecta Transacciones.'}</p><div className='flex gap-2 mt-3'><button type='button' onClick={()=>setDeleting(null)} disabled={Boolean(pendingAction)} className='flex-1 border rounded-lg py-2'>Cancelar</button><button type='button' onClick={removeVerification} disabled={Boolean(pendingAction)} className='flex-1 bg-red-600 text-white rounded-lg py-2 font-semibold'>{pendingAction==='delete'?<span className='inline-block w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin'/>:'Eliminar'}</button></div></div>}
				<p className='mt-4 text-xs text-amber-600 dark:text-amber-400'>{isFci ? 'En FCI, la variación del valor de cuotaparte modifica la valuación de la posición, pero no se considera ganancia realizada hasta que exista un rescate/venta.' : 'Las verificaciones nuevas separan rendimiento, aporte, retiro y ajuste. Los snapshots históricos sin clasificación no se suman como rendimiento confirmado ni se envían a Transacciones.'}</p>
			</div>
		</main><AppFooter />
	</>;
}
