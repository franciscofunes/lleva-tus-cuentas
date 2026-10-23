import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaCopy, FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { FINANCIAL_ITEM_SURFACE_STYLES, FINANCIAL_RECORD_DISCLOSURE_STYLES } from '../components/CollapsibleHeading';
import CollapsibleSection from '../components/CollapsibleSection';
import QuickAccessCard from '../components/QuickAccessCard';
import { deletePortfolioSnapshot, registerReconciliationTransaction, savePortfolioReconciliation, subscribePortfolioPositions, subscribePortfolioReconciliations, subscribePortfolioSnapshots, updatePortfolioSnapshot } from '../services/portfolioService';
import PortfolioHistoryModal from '../components/PortfolioHistoryModal';
import PortfolioAccountOverview from '../components/PortfolioAccountOverview';
import { accountMovementType, accountMovementLabel, groupAccountEarnings, sortedAccountSnapshots } from '../utils/portfolioAccountActivity';

const money = (value, currency = 'USD') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0));
const asDate = (value) => value?.toDate ? value.toDate() : new Date(value);
const startOf = (date, mode) => {
	const d = new Date(date);
	if (mode === 'day') d.setHours(0,0,0,0);
	if (mode === 'week') { const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); }
	if (mode === 'month') { d.setDate(1); d.setHours(0,0,0,0); }
	return d;
};
// Same 44px opaque slate/violet action hierarchy as Transactions.
const historyEditButtonClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700';
const historyDeleteButtonClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40';

const movementTone = (row) => {
  const type = accountMovementType(row);
  if (type === 'earning') return Number(row.observedEarning || 0) < 0
    ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400';
  if (type === 'unclassified') return 'text-amber-700 dark:text-amber-300';
  return 'text-slate-800 dark:text-slate-100';
};
const movementValue = (row, currency) =>
  money(['withdrawal','deposit'].includes(accountMovementType(row))
    ? Math.abs(Number(row.observedEarning || 0)) : row.observedEarning, currency);

export default function PortfolioDetail() {
	const { positionId } = useParams();
	const user = useSelector((state) => state.auth.user);
	const [positions,setPositions]=useState([]); const [snapshots,setSnapshots]=useState([]); const [reconciliations,setReconciliations]=useState([]); const [mode,setMode]=useState('day');
	const [historyFilter,setHistoryFilter]=useState('all');
	const [revealedAccountFields,setRevealedAccountFields]=useState({});
	useEffect(()=>setRevealedAccountFields({}),[positionId]);
	const [editing,setEditing]=useState(null); const [deleting,setDeleting]=useState(null); const [pendingAction,setPendingAction]=useState('');
	const openEditModal = (row) => { if (pendingAction) return; setDeleting(null); setEditing({...row}); };
	const openDeleteModal = (row) => { if (pendingAction) return; setEditing(null); setDeleting(row); };
	const closeHistoryModal = useCallback(() => { if (pendingAction) return; setEditing(null); setDeleting(null); }, [pendingAction]);
	const detailPreferenceKey = user?.uid ? `ltc:portfolio:detail:${user.uid}` : 'ltc:portfolio:detail';
	const [openSections,setOpenSections]=useState({ overview:true, earnings:true, account:false, monthly:true, history:true });
	useEffect(()=>{ if(!user) return; try { const saved=JSON.parse(localStorage.getItem(detailPreferenceKey) || '{}'); if(saved.openSections) setOpenSections((current)=>({...current,...saved.openSections})); } catch {} },[user,detailPreferenceKey]);
	useEffect(()=>{ if(!user) return; localStorage.setItem(detailPreferenceKey,JSON.stringify({openSections})); },[user,detailPreferenceKey,openSections]);
	const toggleSection=(key)=>setOpenSections((current)=>({...current,[key]:!current[key]}));
	useEffect(() => { if(!user) return; const a=subscribePortfolioPositions(user.uid,setPositions,console.error); const b=subscribePortfolioSnapshots(user.uid,setSnapshots,console.error); const c=subscribePortfolioReconciliations(user.uid,setReconciliations,console.error); return()=>{a();b();c();}; },[user]);
	const position=positions.find((item)=>item.id===positionId);
	const history=useMemo(()=>sortedAccountSnapshots(snapshots.filter((item)=>item.positionId===positionId)),[snapshots,positionId]);
	const filteredHistory=useMemo(()=>history.filter((row)=>historyFilter==='all' || (historyFilter==='earning' && accountMovementType(row)==='earning') || (historyFilter==='capital' && ['withdrawal','deposit'].includes(accountMovementType(row))) || (historyFilter==='other' && !['earning','withdrawal','deposit'].includes(accountMovementType(row)))),[history,historyFilter]);
	const grouped=useMemo(()=>groupAccountEarnings(history,mode),[history,mode]);
	const monthly=useMemo(()=>Object.values(history.reduce((acc,row)=>{ const d=asDate(row.capturedAt); const month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if(!acc[month]) acc[month]={month,rows:[],amount:0}; acc[month].rows.push(row); if(row.changeType==='earning') acc[month].amount += Number(row.confirmedEarning ?? row.observedEarning ?? 0); return acc; },{})).sort((a,b)=>b.month.localeCompare(a.month)),[history]);
	const total=history.reduce((sum,item)=>sum+(accountMovementType(item)==='earning' ? Number(item.confirmedEarning ?? item.observedEarning ?? 0) : 0),0);
	const isFci = Boolean(position && (position.category === 'FCI' || position.trackingMode === 'NAV'));
	const isRemunerated = Boolean(position && !isFci && (position.category === 'Cuenta remunerada' || position.trackingMode === 'DAILY_RATE'));
	const valuationHistory = useMemo(() => {
		const rows = history
			.filter((row) => row.changeType === 'valuation' || Number(row.nav || 0) > 0)
			.map((row) => ({ ...row, navValue: Number(row.nav || 0) }));
		let previousValidNav = null;
		return rows.map((row) => {
			const navChangePercent = previousValidNav > 0 && row.navValue > 0
				? ((row.navValue / previousValidNav) - 1) * 100
				: null;
			if (row.navValue > 0) previousValidNav = row.navValue;
			return { ...row, navChangePercent };
		});
	}, [history]);
	const navHistory = useMemo(
		() => valuationHistory.filter((row) => row.navValue > 0),
		[valuationHistory]
	);
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
				<QuickAccessCard eyebrow='Detalle del Portfolio' title={position.name}
					description={position.institution + ' · ' + position.currency}
					actionsClassName='min-w-0 sm:shrink-0'>
					<Link to='/portfolio' className='inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700'>
						← Volver al Portfolio
					</Link>
				</QuickAccessCard>
				<CollapsibleSection id='portfolio-overview' title='Resumen de la posición' description='Datos actuales por moneda y tipo de activo.' collapsed={!openSections.overview} onToggle={()=>toggleSection('overview')} className='mt-5'>
					
					{isRemunerated ? <PortfolioAccountOverview position={position} snapshots={history} /> : isFci ? (
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
				</CollapsibleSection>
				<CollapsibleSection
					id='portfolio-earnings'
					title={isFci ? 'Evolución de la cuotaparte' : 'Rendimientos registrados'}
					description={isFci ? 'Seguimiento de NAV y valuación. No se trata como ganancia realizada hasta rescatar.' : 'Solo movimientos marcados como interés. Los retiros y aportes no son ganancias ni pérdidas.'}
					collapsed={!openSections.earnings}
					onToggle={()= className='mt-5'>toggleSection('earnings')}
				>
					{isFci ? (
						<div className='mt-4 space-y-3'>
							{navHistory.length===0 ? <p className='text-gray-500'>Todavía no hay valuaciones con valor de cuotaparte.</p> : [...navHistory].reverse().map((row) => (
								<div key={row.id} className={FINANCIAL_ITEM_SURFACE_STYLES}>
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
							<div className='flex flex-wrap items-center justify-end gap-3'><div className='flex gap-2'>{['day','week','month'].map((item)=><button key={item} onClick={()=>setMode(item)} className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${mode===item?'border-violet-600 bg-violet-600 text-white':'border-slate-300 bg-white text-slate-700 hover:border-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'}`}>{item==='day'?'Día':item==='week'?'Semana':'Mes'}</button>)}</div></div>
							<p className='mt-3 text-xs text-slate-600 dark:text-slate-300'>El esperado es una estimación por día con datos cargados, no se duplica al verificar varias veces.</p><div className='mt-4 space-y-3'>{grouped.length===0?<p className='text-gray-500'>Todavía no hay verificaciones para graficar.</p>:grouped.map((row)=>{const max=Math.max(...grouped.map(x=>Math.abs(x.earning)),1);return <div key={row.date.toISOString()}><div className='flex justify-between text-sm'><span>{row.date.toLocaleDateString('es-AR')}</span><strong className={row.earning>=0?'text-green-500':'text-red-500'}>{money(row.earning,position.currency)}</strong></div><div className='h-2 rounded bg-slate-200 dark:bg-slate-700 mt-1 overflow-hidden'><div className='h-full bg-purple-500' style={{width:`${Math.min(100,Math.abs(row.earning)/max*100)}%`}} /></div><p className='text-xs text-gray-500 mt-1'>{row.checks} verificación(es) · esperado {money(row.expected,position.currency)}</p></div>})}</div>
						</>
					)}
				</CollapsibleSection>
				{hasAccountDetails && <CollapsibleSection id='portfolio-account' title='Datos de cuenta' description='Datos para recibir transferencias o fondear esta posición.' collapsed={!openSections.account} onToggle={()= className='mt-5'>toggleSection('account')}>
					<div className='grid md:grid-cols-2 gap-3 mt-5'>
						{position.accountHolder && <div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Titular</p><p className='font-semibold mt-1'>{position.accountHolder}</p></div>}
						{position.bankName && <div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Banco receptor</p><p className='font-semibold mt-1'>{position.bankName}</p></div>}
						{position.accountType && <div className='rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Tipo de cuenta</p><p className='font-semibold mt-1'>{position.accountType}</p></div>}
						{accountRows.map(([label,value]) => {
							const visible=Boolean(revealedAccountFields[label]);
							return <div key={label} className='flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70'>
								<div className='min-w-0'><p className='text-xs text-slate-600 dark:text-slate-300'>{label}</p>
									<p className='mt-1 break-all font-semibold' aria-label={visible ? label : label + ' oculto'}>{visible ? value : '••••••'}</p></div>
								<div className='flex flex-wrap items-center gap-2'>
									<button type='button' aria-pressed={visible}
										aria-label={(visible ? 'Ocultar ' : 'Mostrar ') + label}
										onClick={()=>setRevealedAccountFields((current)=>({...current,[label]:!current[label]}))}
										className={FINANCIAL_RECORD_DISCLOSURE_STYLES + ' border border-slate-300 px-3 dark:border-slate-600'}>
										{visible ? 'Ocultar' : 'Mostrar'}
									</button>
									{visible && <button type='button' onClick={()=>copyValue(label,value)}
										aria-label={'Copiar ' + label}
										className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'>
										<FaCopy aria-hidden='true'/>
									</button>}
								</div>
							</div>;
						})}
					</div>
					{position.bankAddress && <div className='mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3'><p className='text-xs text-gray-500'>Dirección del banco</p><p className='font-semibold mt-1'>{position.bankAddress}</p></div>}
					{position.depositInstructions && <div className='mt-3 rounded-xl border border-purple-200 dark:border-purple-900/60 p-3'><p className='text-xs text-gray-500'>Instrucciones</p><p className='text-sm mt-1'>{position.depositInstructions}</p></div>}
				</CollapsibleSection>}
				<CollapsibleSection
					id='portfolio-monthly'
					title={isFci ? 'Rendimiento publicado del fondo' : 'Cierre mensual'}
					description={isFci ? 'Información porcentual publicada por el fondo. Es distinta de tu ganancia realizada.' : 'Consolida solamente verificaciones clasificadas como rendimiento. Todavía no crea una transacción.'}
					collapsed={!openSections.monthly}
					onToggle={()= className='mt-5'>toggleSection('monthly')}
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
						<div className='mt-4 space-y-3'>{monthly.length===0?<p className='text-gray-500'>Todavía no hay meses para conciliar.</p>:monthly.map(item=>{const saved=reconciliations.find(r=>r.positionId===positionId&&r.month===item.month); const busy=pendingAction===`month-${item.month}`; return <div key={item.month} className='rounded-xl border dark:border-slate-700 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3'><div><p className='font-bold'>{new Date(`${item.month}-01T12:00:00`).toLocaleDateString('es-AR',{month:'long',year:'numeric'})}</p><p className='text-sm text-gray-500'>{money(item.amount,position.currency)} confirmados · {item.rows.filter(r=>r.changeType==='earning').length} rendimiento(s)</p><p className={`text-xs mt-1 ${saved?'text-green-500':'text-amber-500'}`}>{saved?.transactionId?'Registrado en Transacciones':saved?'Cierre guardado · pendiente de registrar en Transacciones':'Pendiente de cierre'}</p></div><div className='flex flex-col sm:flex-row gap-2'><button type='button' onClick={()=>closeMonth(item)} disabled={Boolean(pendingAction) || Boolean(saved?.transactionId)} className='inline-flex min-h-[44px] min-w-[130px] items-center justify-center rounded-xl border border-violet-500 bg-white px-3 py-2.5 font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:bg-slate-900 dark:text-violet-200'>{busy?<span className='inline-block w-5 h-5 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin'/>:(saved?.transactionId?'Cierre registrado':saved?'Actualizar cierre':'Cerrar mes')}</button>{saved && <button type='button' onClick={()=>registerMonth(saved)} disabled={Boolean(pendingAction) || Boolean(saved.transactionId)} className='inline-flex min-h-[44px] min-w-[170px] items-center justify-center rounded-xl bg-violet-600 px-3 py-2.5 font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50'>{pendingAction===`register-${item.month}`?<span className='inline-block w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin'/>:(saved.transactionId?'Registrado ✓':'Registrar en Transacciones')}</button>}</div></div>})}</div>
					)}
				</CollapsibleSection>
				<CollapsibleSection
					id='portfolio-history'
					title={isFci ? 'Historial de valuaciones' : 'Movimientos y verificaciones'}
					description={isFci ? 'Cada registro representa un valor de cuotaparte observado y la valuación resultante.' : 'Rendimientos, aportes, retiros y ajustes. Un retiro no es una pérdida de inversión.'}
					collapsed={!openSections.history}
					onToggle={()= className='mt-5'>toggleSection('history')}
				>
					{isFci ? (
						<>
							<div className='mt-4 space-y-3 md:hidden'>
								{[...valuationHistory].reverse().map((row)=><article key={row.id} className={FINANCIAL_ITEM_SURFACE_STYLES}>
									<div className='flex items-start justify-between gap-3'>
										<div className='min-w-0'><p className='text-xs text-gray-500'>Fecha</p><p className='font-semibold text-sm mt-0.5'>{asDate(row.capturedAt).toLocaleString('es-AR')}</p></div>
										<div className='flex shrink-0 gap-2'><button type='button' onClick={()=>openEditModal(row)} className={historyEditButtonClass} aria-label='Editar valuación'><FaPencilAlt /></button><button type='button' onClick={()=>openDeleteModal(row)} className={historyDeleteButtonClass} aria-label='Eliminar valuación'><FaTrashAlt /></button></div>
									</div>
									<div className='grid grid-cols-2 gap-x-4 gap-y-3 mt-4'>
										<div><p className='text-xs text-gray-500'>Valor cuotaparte</p><p className='font-semibold'>{row.navValue > 0 ? row.navValue.toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</p></div>
										<div><p className='text-xs text-gray-500'>Variación NAV</p><p className={`font-semibold ${row.navChangePercent == null ? 'text-gray-400' : row.navChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.navChangePercent == null ? 'Inicial' : `${row.navChangePercent >= 0 ? '+' : ''}${row.navChangePercent.toFixed(3)}%`}</p></div>
										<div><p className='text-xs text-gray-500'>Cuotapartes</p><p className='font-medium'>{Number(row.shares || position.shares || 0) > 0 ? Number(row.shares || position.shares).toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</p></div>
										<div><p className='text-xs text-gray-500'>Valuación</p><p className='font-medium whitespace-nowrap'>{money(row.balance,position.currency)}</p></div>
									</div>
									{row.note && <p className='mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-gray-500 break-words'>{row.note}</p>}
								</article>)}
								{valuationHistory.length===0 && <p className='text-gray-500'>Todavía no hay valuaciones NAV guardadas.</p>}
							</div>
							<div className='mt-4 hidden md:block overflow-x-auto'>
								<table className='w-full min-w-[760px] text-sm'>
									<thead><tr className='text-left text-gray-500'><th className='py-2 pr-4'>Fecha</th><th className='pr-4'>Cuotaparte</th><th className='pr-4'>Variación NAV</th><th className='pr-4'>Cuotapartes</th><th className='pr-4'>Valuación</th><th className='text-right'>Acciones</th></tr></thead>
									<tbody>{[...valuationHistory].reverse().map((row)=><tr key={row.id} className='border-t dark:border-slate-700'><td className='py-3 pr-4 whitespace-nowrap'>{asDate(row.capturedAt).toLocaleString('es-AR')}</td><td className='pr-4 whitespace-nowrap'>{row.navValue > 0 ? row.navValue.toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</td><td className={`pr-4 whitespace-nowrap ${row.navChangePercent == null ? 'text-gray-400' : row.navChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.navChangePercent == null ? 'Inicial' : `${row.navChangePercent >= 0 ? '+' : ''}${row.navChangePercent.toFixed(3)}%`}</td><td className='pr-4 whitespace-nowrap'>{Number(row.shares || position.shares || 0) > 0 ? Number(row.shares || position.shares).toLocaleString('es-AR',{maximumFractionDigits:6}) : '—'}</td><td className='pr-4 whitespace-nowrap'>{money(row.balance,position.currency)}</td><td><div className='flex justify-end gap-2'><button type='button' onClick={()=>openEditModal(row)} className={historyEditButtonClass} aria-label='Editar valuación'><FaPencilAlt /></button><button type='button' onClick={()=>openDeleteModal(row)} className={historyDeleteButtonClass} aria-label='Eliminar valuación'><FaTrashAlt /></button></div></td></tr>)}</tbody>
								</table>
							</div>
						</>
					) : (
						<>
							<div className='mt-4 flex flex-wrap gap-2' role='group' aria-label='Filtrar movimientos'>
								{[['all','Todos'],['earning','Intereses'],['capital','Capital'],['other','Otros']].map(([key,label])=>(
									<button key={key} type='button' onClick={()=>setHistoryFilter(key)} aria-pressed={historyFilter===key}
										className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${historyFilter===key?'border-violet-600 bg-violet-600 text-white':'border-slate-300 bg-white text-slate-700 hover:border-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'}`}>
										{label}
									</button>
								))}
							</div>
							<div className='mt-2 text-xs text-slate-600 dark:text-slate-300'>Los importes de aportes y retiros son movimientos de capital, no resultados. Registros ordenados por fecha y hora.</div>
							<div className='mt-4 space-y-3 md:hidden'>{[...filteredHistory].reverse().map(row=><article key={row.id} className={FINANCIAL_ITEM_SURFACE_STYLES}><div className='flex items-start justify-between gap-3'><div className='min-w-0'><p className='text-xs text-gray-500'>Fecha</p><p className='font-semibold text-sm mt-0.5'>{asDate(row.capturedAt).toLocaleString('es-AR')}</p></div><div className='flex shrink-0 gap-2'><button type='button' onClick={()=>openEditModal(row)} className={historyEditButtonClass} aria-label='Editar verificación'><FaPencilAlt /></button><button type='button' onClick={()=>openDeleteModal(row)} className={historyDeleteButtonClass} aria-label='Eliminar verificación'><FaTrashAlt /></button></div></div><div className='grid grid-cols-2 gap-x-4 gap-y-3 mt-4'><div><p className='text-xs text-gray-500'>Saldo</p><p className='font-semibold whitespace-nowrap'>{money(row.balance,position.currency)}</p></div><div><p className='text-xs text-gray-500'>Cambio</p><p className={`font-semibold tabular-nums ${movementTone(row)}`}>{movementValue(row,position.currency)}</p></div><div><p className='text-xs text-gray-500'>Tipo</p><p className='font-medium'>{accountMovementLabel(accountMovementType(row))}</p></div><div><p className='text-xs text-gray-500'>Esperado</p><p className='font-medium whitespace-nowrap'>{money(row.expectedEarning,position.currency)}</p></div></div>{row.note && <p className='mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-gray-500 break-words'>{row.note}</p>}</article>)}</div>
							<div className='mt-4 hidden md:block overflow-x-auto'><table className='w-full min-w-[760px] text-sm'><thead><tr className='text-left text-gray-500'><th className='py-2 pr-4'>Fecha</th><th className='pr-4'>Saldo</th><th className='pr-4'>Cambio</th><th className='pr-4'>Tipo</th><th className='pr-4'>Esperado</th><th className='text-right'>Acciones</th></tr></thead><tbody>{[...filteredHistory].reverse().map(row=><tr key={row.id} className='border-t dark:border-slate-700'><td className='py-3 pr-4 whitespace-nowrap'>{asDate(row.capturedAt).toLocaleString('es-AR')}</td><td className='pr-4 whitespace-nowrap'>{money(row.balance,position.currency)}</td><td className={`pr-4 whitespace-nowrap ${movementTone(row)}`}>{movementValue(row,position.currency)}</td><td className='pr-4 whitespace-nowrap'>{accountMovementLabel(accountMovementType(row))}</td><td className='pr-4 whitespace-nowrap'>{money(row.expectedEarning,position.currency)}</td><td><div className='flex justify-end gap-2'><button type='button' onClick={()=>openEditModal(row)} className={historyEditButtonClass} aria-label='Editar verificación'><FaPencilAlt /></button><button type='button' onClick={()=>openDeleteModal(row)} className={historyDeleteButtonClass} aria-label='Eliminar verificación'><FaTrashAlt /></button></div></td></tr>)}</tbody></table></div>
						</>
					)}
				</CollapsibleSection>
				<p className='mt-4 text-xs text-amber-600 dark:text-amber-400'>{isFci ? 'En FCI, la variación del valor de cuotaparte modifica la valuación de la posición, pero no se considera ganancia realizada hasta que exista un rescate/venta.' : 'Las verificaciones nuevas separan rendimiento, aporte, retiro y ajuste. Los snapshots históricos sin clasificación no se suman como rendimiento confirmado ni se envían a Transacciones.'}</p>
			</div>
		</main>
		{(editing || deleting) && (
			<PortfolioHistoryModal
				mode={editing ? 'edit' : 'delete'}
				item={editing || deleting}
				isFci={isFci}
				currency={position.currency}
				onChange={setEditing}
				onSave={saveVerification}
				onDelete={removeVerification}
				onClose={closeHistoryModal}
				busy={Boolean(pendingAction)}
			/>
		)}
	</>;
}
