import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
	createPortfolioPosition,
	createPortfolioSnapshot,
	deletePortfolioPosition,
	subscribePortfolioPositions,
	updatePortfolioPosition,
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
	startDate: '',
	maturityDate: '',
	notes: '',
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
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);
	const [loading, setLoading] = useState(true);

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

	if (isFetching) return <div className='p-8 text-center dark:text-white'>Cargando...</div>;
	if (!user) return <Navigate to='/' />;

	const onChange = (event) =>
		setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

	const reset = () => {
		setForm(emptyForm);
		setEditingId(null);
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
		});
		window.scrollTo({ top: 0, behavior: 'smooth' });
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

	const snapshot = async (position) => {
		try {
			await createPortfolioSnapshot(user.uid, position);
			toast.success('Snapshot guardado');
		} catch (error) {
			toast.error('No se pudo guardar el snapshot');
		}
	};

	return (
		<main className='min-h-screen bg-zinc-50 dark:bg-gray-900 dark:text-zinc-100 p-4 lg:p-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='flex flex-wrap justify-between items-end gap-4 mb-6'>
					<div>
						<p className='text-sm font-semibold text-purple-600'>LTC$ Portfolio</p>
						<h1 className='text-3xl font-bold'>Cuentas e inversiones</h1>
						<p className='text-gray-500 dark:text-gray-400'>Monitoreá capital, rendimiento estimado y snapshots sin mezclar monedas.</p>
					</div>
					<Link to='/transacciones' className='nav-btn dark:text-white'>Ver transacciones</Link>
				</div>

				<section className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
					{Object.entries(totals).map(([currency, total]) => (
						<div key={currency} className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5 shadow-sm'>
							<p className='text-sm text-gray-500'>{currency}</p>
							<p className='text-2xl font-bold'>{money(total.balance, currency)}</p>
							<p className='text-sm text-green-600 mt-2'>Estimado anual: {money(total.annual, currency)}</p>
							<p className='text-xs text-gray-400'>Estimado mensual: {money(total.annual / 12, currency)}</p>
						</div>
					))}
					{!Object.keys(totals).length && <div className='text-gray-500'>Todavía no cargaste posiciones.</div>}
				</section>

				<div className='grid lg:grid-cols-3 gap-6'>
					<form onSubmit={submit} className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5 shadow-sm h-fit'>
						<h2 className='text-xl font-bold mb-4'>{editingId ? 'Editar posición' : 'Nueva posición'}</h2>
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

					<section className='lg:col-span-2 space-y-3'>
						<h2 className='text-xl font-bold'>Posiciones</h2>
						{loading && <p className='text-gray-500'>Cargando portfolio...</p>}
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
										<p className='text-sm text-green-600 mt-1'>≈ {money(Number(position.balance || 0) * Number(position.annualRate || 0) / 100 / 12, position.currency)} / mes</p>
									</div>
								</div>
								<div className='flex flex-wrap gap-2 mt-4'>
									<button className='px-3 py-2 rounded-lg border dark:border-slate-600' onClick={() => snapshot(position)}>Guardar snapshot</button>
									<button className='px-3 py-2 rounded-lg border dark:border-slate-600' onClick={() => edit(position)}>Editar</button>
									<button className='px-3 py-2 rounded-lg text-red-600 border border-red-200' onClick={() => remove(position.id)}>Eliminar</button>
								</div>
							</article>
						))}
					</section>
				</div>
			</div>
		</main>
	);
}

export default Portfolio;
