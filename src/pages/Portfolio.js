import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaWallet, FaChartLine, FaRegClock } from 'react-icons/fa';
import PrimaryFab from '../components/PrimaryFab';
import wavesFooter from '../imgs/waves.svg';
import PortfolioCharts from '../components/PortfolioCharts';
import { IoMdClose } from 'react-icons/io';
import { AnimatePresence, motion } from 'framer-motion';
import {
	createPortfolioPosition,
	createPortfolioSnapshot,
	deletePortfolioPosition,
	subscribePortfolioPositions,
	subscribePortfolioSnapshots,
	updatePortfolioPosition,
	verifyPortfolioPosition,
} from '../services/portfolioService';

const emptyForm = {
	institution: '',
	name: '',
	category: 'Cuenta remunerada',
	currency: 'ARS',
	balance: '',
	annualRate: '',
	rateType: 'TNA',
	liquidity: 'Inmediata',
	fees: '0',
	principal: '',
	realizedEarnings: '',
	lastEarning: '',
	effectiveRate: '',
	startDate: '',
	maturityDate: '',
	notes: '',
	trackingMode: 'DAILY_RATE',
	appUrl: '',
};

const money = (value, currency) =>
	new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency,
		maximumFractionDigits: currency === 'ARS' ? 0 : 2,
	}).format(Number(value || 0));

function Portfolio() {
	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);
	const [positions, setPositions] = useState([]);
	const [snapshots, setSnapshots] = useState([]);
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);

	useEffect(() => {
		if (!user) return undefined;
		return subscribePortfolioPositions(
			user.uid,
			(data) => {
				setPositions(data);
				setLoading(false);
			},
			() => {
				toast.error('No se pudo cargar el portfolio');
				setLoading(false);
			}
		);
	}, [user]);

	useEffect(() => {
		if (!user) return undefined;
		return subscribePortfolioSnapshots(
			user.uid,
			setSnapshots,
			() => toast.error('No se pudo cargar el historial del portfolio')
		);
	}, [user]);

	const performanceByPosition = useMemo(() => {
		const grouped = snapshots.reduce((acc, item) => {
			if (!acc[item.positionId]) acc[item.positionId] = [];
			acc[item.positionId].push(item);
			return acc;
		}, {});

		return Object.entries(grouped).reduce((acc, [positionId, history]) => {
			if (history.length < 2) return acc;
			const first = history[0];
			const last = history[history.length - 1];
			const change = Number(last.balance || 0) - Number(first.balance || 0);
			const percent = Number(first.balance || 0) > 0
				? (change / Number(first.balance)) * 100
				: 0;
			acc[positionId] = { change, percent, count: history.length };
			return acc;
		}, {});
	}, [snapshots]);

	const totals = useMemo(() => {
		return positions.reduce((acc, position) => {
			const currency = position.currency || 'ARS';
			const balance = Number(position.balance || 0);
			const annualRate = Number(position.annualRate || 0) / 100;
			if (!acc[currency]) acc[currency] = { balance: 0, annual: 0 };
			acc[currency].balance += balance;
			acc[currency].annual += balance * annualRate;
			return acc;
		}, {});
	}, [positions]);

	const portfolioMeta = useMemo(() => ({
		positions: positions.length,
		snapshots: snapshots.length,
		currencies: Object.keys(totals).length,
	}), [positions.length, snapshots.length, totals]);

	const weightedRates = useMemo(() => {
		return Object.entries(totals).reduce((acc, [currency, total]) => {
			acc[currency] = total.balance > 0 ? (total.annual / total.balance) * 100 : 0;
			return acc;
		}, {});
	}, [totals]);

	if (isFetching) return <div className='p-8 text-center dark:text-white'>Cargando...</div>;
	if (!user) return <Navigate to='/' />;

	const onChange = (event) =>
		setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

	const reset = () => {
		setForm(emptyForm);
		setEditingId(null);
		setShowForm(false);
	};

	const submit = async (event) => {
		event.preventDefault();
		try {
			if (editingId) {
				await updatePortfolioPosition(user.uid, editingId, form);
				toast.success('Posición actualizada');
			} else {
				await createPortfolioPosition(user.uid, form);
				toast.success('Posición agregada');
			}
			reset();
		} catch (error) {
			toast.error('No se pudo guardar la posición');
		}
	};

	const edit = (position) => {
		setEditingId(position.id);
		setForm({
			...emptyForm,
			...position,
			balance: String(position.balance ?? ''),
			annualRate: String(position.annualRate ?? ''),
			fees: String(position.fees ?? 0),
			principal: String(position.principal ?? position.balance ?? ''),
			realizedEarnings: String(position.realizedEarnings ?? ''),
			lastEarning: String(position.lastEarning ?? ''),
			effectiveRate: String(position.effectiveRate ?? ''),
		});
		setShowForm(true);
	};

	const remove = async (positionId) => {
		if (!window.confirm('¿Eliminar esta posición del portfolio?')) return;
		try {
			await deletePortfolioPosition(user.uid, positionId);
			toast.warn('Posición eliminada');
		} catch (error) {
			toast.error('No se pudo eliminar');
		}
	};

	const verify = async (position) => {
		const value = window.prompt('Saldo actual para verificar', String(position.balance || ''));
		if (value === null || value === '') return;
		try {
			await verifyPortfolioPosition(user.uid, position, value);
			toast.success('Saldo verificado y snapshot guardado');
		} catch (error) {
			toast.error('No se pudo verificar el saldo');
		}
	};

	const openInstitution = (position) => {
		if (!position.appUrl) {
			toast.info('Todavía no configuraste un acceso para esta institución');
			return;
		}
		window.location.href = position.appUrl;
	};

	const snapshot = async (position) => {
		try {
			await createPortfolioSnapshot(user.uid, position);
			toast.success('Snapshot guardado');
		} catch (error) {
			toast.error('No se pudo guardar el snapshot');
		}
	};

	return (
		<main className='relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-gray-900 dark:text-zinc-100 p-4 lg:p-8 pb-32 lg:pb-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='flex flex-wrap justify-between items-end gap-4 mb-6'>
					<div>
						<p className='text-sm font-semibold text-purple-600'>LTC$ Portfolio</p>
						<h1 className='text-3xl font-bold'>Cuentas e inversiones</h1>
						<p className='text-gray-500 dark:text-gray-400 max-w-2xl'>Tu patrimonio financiero en un solo lugar. Los totales y rendimientos se mantienen separados por moneda.</p>
					</div>
					<Link to='/transacciones' className='nav-btn dark:text-white'>Ver transacciones</Link>
				</div>

				<section className='grid grid-cols-3 gap-2 sm:gap-4 mb-6'>
					<div className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-3 sm:p-4 shadow-sm'>
						<FaWallet className='text-purple-500 mb-2' />
						<p className='text-xl sm:text-2xl font-bold'>{portfolioMeta.positions}</p>
						<p className='text-xs text-gray-500'>Posiciones</p>
					</div>
					<div className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-3 sm:p-4 shadow-sm'>
						<FaChartLine className='text-purple-500 mb-2' />
						<p className='text-xl sm:text-2xl font-bold'>{portfolioMeta.currencies}</p>
						<p className='text-xs text-gray-500'>Monedas</p>
					</div>
					<div className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-3 sm:p-4 shadow-sm'>
						<FaRegClock className='text-purple-500 mb-2' />
						<p className='text-xl sm:text-2xl font-bold'>{positions.filter((item) => Number(item.realizedEarnings || 0) > 0).length}</p>
						<p className='text-xs text-gray-500'>Con ganancias</p>
					</div>
				</section>

				<section className='mb-7'>
					<div className='flex items-center justify-between mb-3'>
						<h2 className='text-lg font-bold'>Resumen por moneda</h2>
						<span className='text-xs text-gray-500'>Sin conversión FX</span>
					</div>
					<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>

					{Object.entries(totals).map(([currency, total]) => (
						<div key={currency} className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm'>
							<p className='text-sm text-gray-500'>{currency}</p>
							<p className='text-2xl font-bold'>{money(total.balance, currency)}</p>
							<p className='text-sm text-green-600 mt-2'>Estimado anual: {money(total.annual, currency)}</p>
							<p className='text-xs text-gray-400'>Estimado mensual: {money(total.annual / 12, currency)}</p>
							<p className='text-xs text-gray-400'>Tasa ponderada: {weightedRates[currency].toFixed(2)}%</p>
						</div>
					))}
					{!Object.keys(totals).length && <div className='text-gray-500'>Todavía no cargaste posiciones.</div>}
					</div>
				</section>

				<PortfolioCharts positions={positions} snapshots={snapshots} />

				<section className='space-y-3 pb-20'>
						<div className='flex items-center justify-between'><h2 className='text-xl font-bold'>Posiciones</h2><span className='text-xs text-gray-500'>{positions.length} activas</span></div>
						{loading && <p className='text-gray-500'>Cargando portfolio...</p>}
						{!loading && !positions.length && (
							<div className='border border-dashed dark:border-slate-700 rounded-2xl p-8 text-center'>
								<div className='w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center'><FaWallet /></div>
								<h3 className='font-semibold'>Tu portfolio está vacío</h3>
								<p className='text-sm text-gray-500 mt-1'>Agregá tu primera cuenta o inversión desde el botón +.</p>
								<button type='button' onClick={() => setShowForm(true)} className='mt-4 px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold transition-colors'>Agregar posición</button>
							</div>
						)}
						{!loading && positions.map((position) => (
							<article key={position.id} className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5 shadow-sm'>
								<div className='flex flex-wrap justify-between gap-4'>
									<div>
										<p className='text-xs uppercase text-gray-400'>{position.category} · {position.institution}</p>
										<h3 className='text-lg font-bold'>{position.name}</h3>
										<p className='text-2xl font-semibold mt-2'>{money(position.balance, position.currency)}</p>
									</div>
									<div className='text-right'>
										<p className='font-semibold'>{Number(position.annualRate || 0).toFixed(2)}% {position.rateType || ''}</p>
										<p className='text-sm text-gray-500'>{position.liquidity || 'Liquidez no informada'}</p>
										<p className='text-sm text-green-600 mt-1'>≈ {money(Number(position.balance || 0) * Number(position.annualRate || 0) / 100 / 12, position.currency)} / mes proyectado</p>
										{position.trackingMode === 'DAILY_RATE' && <p className='text-xs text-gray-400'>Esperado hoy: {money(Number(position.balance || 0) * Number(position.annualRate || 0) / 100 / 365, position.currency)}</p>}
										{position.trackingMode === 'MATURITY' && position.maturityDate && <p className='text-xs text-gray-400'>Seguimiento al vencimiento: {position.maturityDate}</p>}
										<p className='text-xs text-gray-400'>Tracking: {position.trackingMode || 'MANUAL'}</p>
										{Number(position.realizedEarnings || 0) !== 0 && <p className='text-sm font-semibold text-emerald-600 mt-1'>Ganado: {money(position.realizedEarnings, position.currency)}</p>}
										{Number(position.lastEarning || 0) !== 0 && <p className='text-xs text-gray-400'>Último rendimiento: {money(position.lastEarning, position.currency)}</p>}
										{Number(position.effectiveRate || 0) > 0 && <p className='text-xs text-gray-400'>Tasa efectiva: {Number(position.effectiveRate).toFixed(2)}%</p>}
										{performanceByPosition[position.id] && (
											<div className='mt-2 text-sm'>
												<p className={performanceByPosition[position.id].change >= 0 ? 'text-green-600' : 'text-red-500'}>
													Cambio observado: {money(performanceByPosition[position.id].change, position.currency)} ({performanceByPosition[position.id].percent.toFixed(2)}%)
												</p>
												<p className='text-xs text-gray-400'>{performanceByPosition[position.id].count} snapshots</p>
											</div>
										)}
									</div>
								</div>
								<div className='flex flex-wrap gap-2 mt-4'>
									<button className='px-3 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold' onClick={() => verify(position)}>Verificar saldo</button>
									{position.appUrl && <button className='px-3 py-2 rounded-lg border dark:border-slate-600' onClick={() => openInstitution(position)}>Abrir app / web</button>}
									<button className='px-3 py-2 rounded-lg border dark:border-slate-600' onClick={() => snapshot(position)}>Guardar snapshot</button>
									<button className='px-3 py-2 rounded-lg border dark:border-slate-600' onClick={() => edit(position)}>Editar</button>
									<button className='px-3 py-2 rounded-lg text-red-600 border border-red-200' onClick={() => remove(position.id)}>Eliminar</button>
								</div>
							</article>
						))}
					</section>
			</div>

			{!loading && (
				<div className='absolute bottom-0 left-0 w-full block lg:hidden pointer-events-none' aria-hidden='true'>
					<img src={wavesFooter} alt='' className='w-full' />
				</div>
			)}

			<AnimatePresence>
				{showForm && (
					<motion.div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						<motion.div className='w-full sm:max-w-2xl max-h-[92dvh] bg-white dark:bg-slate-800 border-t-2 sm:border-2 border-purple-600 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col' initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
							<div className='flex items-center justify-between px-5 py-4 border-b dark:border-slate-700 shrink-0'>
								<div><p className='text-xs font-semibold text-purple-500'>LTC$ Portfolio</p><h2 className='text-xl font-bold'>{editingId ? 'Editar posición' : 'Nueva posición'}</h2></div>
								<button type='button' aria-label='Cerrar' className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700' onClick={reset}><IoMdClose size={26} /></button>
							</div>
							<div className='overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]'>
<form onSubmit={submit} className='space-y-3'>
						
						<div className='space-y-3'>
							<input className='portfolio-input' name='institution' value={form.institution} onChange={onChange} placeholder='Institución / plataforma' required />
							<input className='portfolio-input' name='name' value={form.name} onChange={onChange} placeholder='Producto / cuenta' required />
							<select className='portfolio-input' name='category' value={form.category} onChange={onChange}>
								{['Cuenta remunerada','Plazo fijo','FCI','ETF','Crypto / staking','Cash','Carry trade','Otro'].map((item) => <option key={item}>{item}</option>)}
							</select>
							<div className='grid grid-cols-2 gap-3'>
								<select className='portfolio-input' name='currency' value={form.currency} onChange={onChange}>
									<option>ARS</option><option>USD</option><option>EUR</option><option>USDT</option>
								</select>
								<input className='portfolio-input' type='number' step='0.01' min='0' name='balance' value={form.balance} onChange={onChange} placeholder='Capital actual' required />
							</div>
							<div className='grid grid-cols-2 gap-3'>
								<input className='portfolio-input' type='number' step='0.01' min='0' name='annualRate' value={form.annualRate} onChange={onChange} placeholder='Tasa anual %' />
								<select className='portfolio-input' name='rateType' value={form.rateType} onChange={onChange}><option>TNA</option><option>TEA</option><option>TIR</option><option>APY</option><option>Variable</option></select>
							</div>
							<select className='portfolio-input' name='trackingMode' value={form.trackingMode || 'MANUAL'} onChange={onChange}>
								<option value='DAILY_RATE'>Cuenta remunerada · diario</option>
								<option value='MATURITY'>Plazo fijo · vencimiento</option>
								<option value='NAV'>FCI · valuación</option>
								<option value='MANUAL'>Manual</option>
							</select>
							<input className='portfolio-input' name='appUrl' value={form.appUrl || ''} onChange={onChange} placeholder='Acceso app/web (opcional)' />
							<input className='portfolio-input' name='liquidity' value={form.liquidity} onChange={onChange} placeholder='Liquidez (ej. inmediata / 24 h)' />
							<input className='portfolio-input' type='number' step='0.01' min='0' name='fees' value={form.fees} onChange={onChange} placeholder='Comisiones estimadas' />
							<div className='grid grid-cols-2 gap-3'>
								<input className='portfolio-input' type='date' name='startDate' value={form.startDate || ''} onChange={onChange} />
								<input className='portfolio-input' type='date' name='maturityDate' value={form.maturityDate || ''} onChange={onChange} />
							</div>
							<textarea className='portfolio-input' name='notes' value={form.notes} onChange={onChange} placeholder='Notas' rows='3' />
						</div>
						<button className='w-full mt-4 py-3 rounded-lg bg-primary text-white font-semibold' type='submit'>{editingId ? 'Guardar cambios' : 'Agregar al portfolio'}</button>
						{editingId && <button className='w-full mt-2 py-2 text-sm' type='button' onClick={reset}>Cancelar edición</button>}
					</form>

							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{!showForm && (
				<PrimaryFab onClick={() => setShowForm(true)} ariaLabel='Agregar posición' />
			)}

		</main>
	);
}

export default Portfolio;
