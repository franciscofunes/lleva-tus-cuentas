import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaWallet, FaChartLine, FaRegClock, FaPencilAlt, FaTrashAlt, FaExternalLinkAlt, FaBookOpen, FaPercent, FaFileExcel, FaFileAlt } from 'react-icons/fa';
import PrimaryFab from '../components/PrimaryFab';
import AppFooter from '../components/AppFooter';
import InfoTooltip from '../components/InfoTooltip';
import PortfolioCharts from '../components/PortfolioCharts';
import GenericModal from '../components/GenericModal';
import { parsePortfolioMarkdown } from '../utils/portfolioMarkdown';
import { exportPortfolioXlsx, buildPortfolioLlmMarkdown } from '../utils/portfolioExport';
import {
	createPortfolioPosition,
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
	webUrl: '',
	infoUrl: '',
	// FCI / NAV-specific metadata
	ticker: '',
	shares: '',
	nav: '',
	navDate: '',
	redemptionPeriod: '',
	minimumInvestment: '',
	performance1D: '',
	performance1W: '',
	performance1M: '',
	performanceYTD: '',
	performance1Y: '',
	fundType: '',
	investmentHorizon: '',
	fundStartDate: '',
	rating: '',
	volatility21dAnnualized: '',
	monthlyReturns: {},
	publishedYtdReturn: '',
	sourceUrl: '', sourceCheckedAt: '', rateVerifiedAt: '', interestCalculationBasis: '', interestAccrual: '', maxInterestBearingBalance: '',
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
	const [positionsLoaded, setPositionsLoaded] = useState(false);
	const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [markdownImport, setMarkdownImport] = useState('');
	const [showMarkdownImport, setShowMarkdownImport] = useState(false);
	const [importPreview, setImportPreview] = useState([]);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [verifyTarget, setVerifyTarget] = useState(null);
	const [verifyBalance, setVerifyBalance] = useState('');
	const [rateTarget, setRateTarget] = useState(null);
		const [quickRate, setQuickRate] = useState('');
	const [pendingAction, setPendingAction] = useState('');
	

	useEffect(() => {
		if (!user) return undefined;
		return subscribePortfolioPositions(
			user.uid,
			(data) => {
				setPositions(data);
				setPositionsLoaded(true);
			},
			() => {
				toast.error('No se pudo cargar el portfolio');
				setPositionsLoaded(true);
			}
		);
	}, [user]);

	useEffect(() => {
		if (!user) return undefined;
		return subscribePortfolioSnapshots(
			user.uid,
			(data) => { setSnapshots(data); setSnapshotsLoaded(true); },
			() => { setSnapshotsLoaded(true); toast.error('No se pudo cargar el historial del portfolio'); }
		);
	}, [user]);

	useEffect(() => {
		if (positionsLoaded && snapshotsLoaded) setLoading(false);
	}, [positionsLoaded, snapshotsLoaded]);

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

	if (isFetching) return <main className='min-h-[calc(100dvh-8.5rem)] bg-zinc-50 dark:bg-gray-900 dark:text-zinc-100 px-4 pt-4 pb-28 lg:p-8'><div className='max-w-7xl mx-auto w-full space-y-6 animate-pulse' aria-label='Cargando portfolio'><div className='space-y-2'><div className='h-9 w-72 max-w-[80%] rounded-lg bg-slate-200 dark:bg-slate-800' /><div className='h-5 w-full max-w-2xl rounded bg-slate-200 dark:bg-slate-800' /></div><section className='grid grid-cols-3 gap-2 sm:gap-4'>{[0,1,2].map((item) => <div key={item} className='h-28 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700' />)}</section><div className='space-y-3'><div className='h-7 w-44 rounded bg-slate-200 dark:bg-slate-800' /><div className='h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700' /></div><div className='space-y-3'><div className='h-7 w-36 rounded bg-slate-200 dark:bg-slate-800' /><div className='h-64 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700' /></div></div></main>;
	if (!user) return <Navigate to='/' />;

	const onChange = (event) =>
		setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

	const monthKeys = [['jan','Ene'],['feb','Feb'],['mar','Mar'],['apr','Abr'],['may','May'],['jun','Jun'],['jul','Jul'],['aug','Ago'],['sep','Sep'],['oct','Oct'],['nov','Nov'],['dec','Dic']];
	const monthlyValues = Object.values(form.monthlyReturns || {}).map(Number).filter(Number.isFinite);
	const monthlySimpleTotal = monthlyValues.reduce((sum, value) => sum + value, 0);
	const monthlyCompoundTotal = (monthlyValues.reduce((factor, value) => factor * (1 + value / 100), 1) - 1) * 100;
	const onMonthlyReturnChange = (month, value) => setForm((current) => ({ ...current, monthlyReturns: { ...(current.monthlyReturns || {}), [month]: value } }));

	const reset = () => {
		setForm(emptyForm);
		setEditingId(null);
		setShowForm(false);
		setMarkdownImport('');
		setShowMarkdownImport(false);
		setImportPreview([]);
	};

	const importMarkdown = () => {
		try {
			const { parsed, unknown } = parsePortfolioMarkdown(markdownImport);
			const preview = Object.entries(parsed).map(([field, value]) => {
				const current = form[field];
				const missing = current === '' || current == null;
				return { field, value, current, missing, changed: String(current ?? '') !== String(value ?? ''), selected: missing };
			}).filter((item) => item.changed);
			setImportPreview(preview);
			if (!preview.length) toast.info('El Markdown no contiene cambios para esta posición.');
			else if (unknown.length) toast.info(`${preview.length} cambios detectados; ${unknown.length} campos no reconocidos.`);
		} catch (error) {
			toast.error(error.message || 'No se pudo interpretar el Markdown');
		}
	};

	const selectImportFields = (mode) => setImportPreview((items) => items.map((item) => ({ ...item, selected: mode === 'all' ? true : mode === 'missing' ? item.missing : false })));
	const toggleImportField = (field) => setImportPreview((items) => items.map((item) => item.field === field ? { ...item, selected: !item.selected } : item));
	const applyImportFields = () => {
		const selected = importPreview.filter((item) => item.selected);
		if (!selected.length) return toast.info('Seleccioná al menos un campo.');
		setForm((current) => selected.reduce((next, item) => ({ ...next, [item.field]: item.value }), current));
		setImportPreview([]);
		setShowMarkdownImport(false);
		toast.success(`${selected.length} campo(s) aplicados. Revisá y guardá la posición.`);
	};

	const submit = async (event) => {
		event.preventDefault();
		if (pendingAction) return;
		setPendingAction('save');
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
		} finally {
			setPendingAction('');
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
			shares: String(position.shares ?? ''),
			nav: String(position.nav ?? ''),
			minimumInvestment: String(position.minimumInvestment ?? ''),
			performance1D: String(position.performance1D ?? ''),
			performance1W: String(position.performance1W ?? ''),
			performance1M: String(position.performance1M ?? ''),
			performanceYTD: String(position.performanceYTD ?? ''),
			performance1Y: String(position.performance1Y ?? ''),
			volatility21dAnnualized: String(position.volatility21dAnnualized ?? ''),
			monthlyReturns: position.monthlyReturns || {},
			publishedYtdReturn: String(position.publishedYtdReturn ?? ''),
		});
		setShowForm(true);
	};

	const requestDelete = (position) => setDeleteTarget(position);

	const remove = async () => {
		if (!deleteTarget || pendingAction) return;
		setPendingAction('delete');
		try {
			await deletePortfolioPosition(user.uid, deleteTarget.id);
			toast.warn('Posición eliminada');
			setDeleteTarget(null);
		} catch (error) {
			toast.error('No se pudo eliminar');
		} finally {
			setPendingAction('');
		}
	};

	const requestVerify = (position) => {
		setVerifyTarget(position);
		setVerifyBalance(String(position.balance || ''));
	};

	const verify = async () => {
		if (!verifyTarget || verifyBalance === '' || pendingAction) return;
		setPendingAction('verify');
		try {
			await verifyPortfolioPosition(user.uid, verifyTarget, verifyBalance);
			toast.success('Saldo verificado y snapshot guardado');
			setVerifyTarget(null);
			setVerifyBalance('');
		} catch (error) {
			toast.error('No se pudo verificar el saldo');
		} finally {
			setPendingAction('');
		}
	};

	const requestRateUpdate = (position) => { setRateTarget(position); setQuickRate(String(position.annualRate ?? '')); };
	const saveQuickRate = async () => { if (!rateTarget || quickRate === '' || pendingAction) return; setPendingAction('rate'); try { await updatePortfolioPosition(user.uid, rateTarget.id, { ...rateTarget, annualRate: quickRate }); toast.success(`Tasa de ${rateTarget.institution} actualizada a ${Number(quickRate).toFixed(2)}%`); setRateTarget(null); setQuickRate(''); } catch (error) { toast.error('No se pudo actualizar la tasa'); } finally { setPendingAction(''); } };
	const copyLlmPrompt = async () => {
		try {
			await navigator.clipboard.writeText(buildPortfolioLlmMarkdown(positions, snapshots));
			toast.success('Prompt LLM copiado al portapapeles');
		} catch (error) {
			toast.error('No se pudo copiar el prompt al portapapeles');
		}
	};
	const openInfo = (position) => { if (!position.infoUrl) { toast.info('Todavía no configuraste una página de información para este activo'); return; } window.open(position.infoUrl, '_blank', 'noopener,noreferrer'); };

	const openInstitution = (position) => {
		if (!position.appUrl && !position.webUrl) {
			toast.info('Todavía no configuraste un acceso para esta institución');
			return;
		}

		const target = (position.appUrl || position.webUrl).trim();
		const fallbackUrl = position.webUrl?.trim();
		const isWebUrl = /^https?:\/\//i.test(target);

		if (isWebUrl) {
			window.location.assign(target);
			return;
		}

		// Custom schemes / universal links can launch an installed mobile app.
		// If the app does not handle the scheme, fall back to its official web page.
		const startedAt = Date.now();
		window.location.assign(target);
		if (fallbackUrl) {
			window.setTimeout(() => {
				if (document.visibilityState === 'visible' && Date.now() - startedAt < 2500) {
					window.location.assign(fallbackUrl);
				}
			}, 1200);
		}
	};


	const portfolioFormContent = (
		<form onSubmit={submit} className='space-y-2 text-white max-h-[78dvh] overflow-y-auto pr-4 mr-1 [scrollbar-gutter:stable]'>
										<h2 className='text-lg font-bold pr-10 mb-2'>{editingId ? 'Editar posición' : 'Nueva posición'}</h2>
										<div className='mb-2'>
											<button type='button' onClick={() => setShowMarkdownImport((value) => !value)} className='w-full py-2 rounded-lg border border-purple-500 text-purple-300 text-sm font-semibold'>{showMarkdownImport ? 'Ocultar importador' : editingId ? 'Enriquecer con Markdown' : 'Pegar Markdown y autocompletar'}</button>
											{showMarkdownImport && <div className='mt-2 p-3 rounded-lg border border-slate-700 bg-slate-950/30'>
												<textarea className='portfolio-input min-h-[120px] text-sm' value={markdownImport} onChange={(event) => { setMarkdownImport(event.target.value); setImportPreview([]); }} placeholder='Pegá Markdown generado desde fuentes oficiales...' />
												<p className='text-xs text-gray-400 mt-1'>Primero compara. Nada se modifica hasta que selecciones campos y guardes la posición.</p>
												<button type='button' disabled={!markdownImport.trim()} onClick={importMarkdown} className='w-full mt-2 py-2 rounded-lg bg-secondary disabled:opacity-40 text-white font-semibold'>Comparar Markdown</button>
												{importPreview.length > 0 && <div className='mt-3 space-y-2'>
													<div className='flex flex-wrap gap-2'><button type='button' onClick={() => selectImportFields('missing')} className='px-2 py-1 rounded border border-slate-600 text-xs'>Solo faltantes</button><button type='button' onClick={() => selectImportFields('all')} className='px-2 py-1 rounded border border-slate-600 text-xs'>Todos los cambios</button><button type='button' onClick={() => selectImportFields('none')} className='px-2 py-1 rounded border border-slate-600 text-xs'>Ninguno</button></div>
													{importPreview.map((item) => <label key={item.field} className='flex gap-3 rounded-lg border border-slate-700 p-2 text-sm cursor-pointer'><input type='checkbox' checked={item.selected} onChange={() => toggleImportField(item.field)} /><span className='min-w-0'><strong>{item.field}</strong>{item.missing && <span className='ml-2 text-green-400 text-xs'>FALTANTE</span>}<span className='block text-xs text-slate-400 break-all'>{String(item.current || '—')} → <span className='text-white'>{String(item.value)}</span></span></span></label>)}
													<button type='button' onClick={applyImportFields} className='w-full py-2 rounded-lg bg-ltc-green text-white font-bold'>Aplicar campos seleccionados</button>
												</div>}
											</div>}
										</div>
											
											<div className='space-y-2'>
												<input className='portfolio-input' name='institution' value={form.institution} onChange={onChange} placeholder='Institución / plataforma' required />
												<input className='portfolio-input' name='name' value={form.name} onChange={onChange} placeholder='Producto / cuenta' required />
												<select className='portfolio-input' name='category' value={form.category} onChange={onChange}>
													{['Cuenta remunerada','Plazo fijo','FCI','ETF','Crypto / staking','Cash','Carry trade','Otro'].map((item) => <option key={item}>{item}</option>)}
												</select>
												<div className='grid grid-cols-2 gap-2'>
													<select className='portfolio-input' name='currency' value={form.currency} onChange={onChange}>
														<option>ARS</option><option>USD</option><option>EUR</option><option>USDT</option>
													</select>
													<input className='portfolio-input' type='number' step='0.01' min='0' name='balance' value={form.balance} onChange={onChange} placeholder='Capital actual' required />
												</div>
												<div className='grid grid-cols-2 gap-2'>
													<input className='portfolio-input' type='number' step='0.01' min='0' name='annualRate' value={form.annualRate} onChange={onChange} placeholder='Tasa anual %' />
													<select className='portfolio-input' name='rateType' value={form.rateType} onChange={onChange}><option>TNA</option><option>TEA</option><option>TIR</option><option>APY</option><option>Variable</option></select>
												</div>
												<select className='portfolio-input' name='trackingMode' value={form.trackingMode || 'MANUAL'} onChange={onChange}>
													<option value='DAILY_RATE'>Cuenta remunerada · diario</option>
													<option value='MATURITY'>Plazo fijo · vencimiento</option>
													<option value='NAV'>FCI · valuación</option>
													<option value='MANUAL'>Manual</option>
												</select>
												{form.category === 'FCI' && (
													<div className='space-y-2 rounded-lg border border-slate-700 p-2'>
														<p className='text-xs font-semibold text-purple-300'>Datos específicos del FCI</p>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' name='ticker' value={form.ticker} onChange={onChange} placeholder='Ticker / clase' /><input className='portfolio-input' name='redemptionPeriod' value={form.redemptionPeriod} onChange={onChange} placeholder='Rescate (ej. 24h)' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='number' step='any' min='0' name='shares' value={form.shares} onChange={onChange} placeholder='Cuotapartes' /><input className='portfolio-input' type='number' step='any' min='0' name='nav' value={form.nav} onChange={onChange} placeholder='Valor cuotaparte / NAV' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='date' name='navDate' value={form.navDate} onChange={onChange} /><input className='portfolio-input' type='number' step='any' min='0' name='minimumInvestment' value={form.minimumInvestment} onChange={onChange} placeholder='Inversión mínima' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='number' step='any' name='performance1D' value={form.performance1D} onChange={onChange} placeholder='Rend. 1D %' /><input className='portfolio-input' type='number' step='any' name='performance1W' value={form.performance1W} onChange={onChange} placeholder='Rend. 1S %' /></div>
														<div className='grid grid-cols-3 gap-2'><input className='portfolio-input' type='number' step='any' name='performance1M' value={form.performance1M} onChange={onChange} placeholder='1M %' /><input className='portfolio-input' type='number' step='any' name='performanceYTD' value={form.performanceYTD} onChange={onChange} placeholder='YTD %' /><input className='portfolio-input' type='number' step='any' name='performance1Y' value={form.performance1Y} onChange={onChange} placeholder='1A %' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' name='fundType' value={form.fundType} onChange={onChange} placeholder='Tipo (ej. Renta fija)' /><input className='portfolio-input' name='investmentHorizon' value={form.investmentHorizon} onChange={onChange} placeholder='Horizonte' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='date' name='fundStartDate' value={form.fundStartDate} onChange={onChange} /><input className='portfolio-input' name='rating' value={form.rating} onChange={onChange} placeholder='Calificación' /></div>
														<input className='portfolio-input' type='number' step='any' min='0' name='volatility21dAnnualized' value={form.volatility21dAnnualized} onChange={onChange} placeholder='Volatilidad 21d anualizada %' />
										<div className='rounded-lg border border-slate-600 p-3 space-y-3'><div><p className='text-sm font-bold text-white'>Rentabilidad mensual</p><p className='text-xs text-gray-300'>Cargá los porcentajes publicados por el fondo. LTC conserva el total publicado y calcula también el acumulado compuesto.</p></div><div className='grid grid-cols-3 gap-2'>{monthKeys.map(([key,label]) => <label key={key} className='text-xs font-semibold text-gray-200'>{label}<input className='portfolio-input mt-1' type='number' step='0.01' value={form.monthlyReturns?.[key] ?? ''} onChange={(event) => onMonthlyReturnChange(key, event.target.value)} placeholder='0.00' /></label>)}</div><div className='grid grid-cols-2 gap-2'><div className='rounded-lg bg-slate-800 p-2'><p className='text-xs text-gray-300'>Suma simple</p><p className='font-bold'>{monthlySimpleTotal.toFixed(2)}%</p></div><div className='rounded-lg bg-slate-800 p-2'><p className='text-xs text-gray-300'>Acumulado compuesto</p><p className='font-bold text-green-400'>{monthlyCompoundTotal.toFixed(2)}%</p></div></div><input className='portfolio-input' type='number' step='0.01' name='publishedYtdReturn' value={form.publishedYtdReturn || ''} onChange={onChange} placeholder='Total YTD publicado por el fondo %' /></div>
													</div>
												)}
												<input className='portfolio-input' name='appUrl' value={form.appUrl || ''} onChange={onChange} placeholder='Acceso app / deep link (opcional)' />
												<input className='portfolio-input' name='webUrl' value={form.webUrl || ''} onChange={onChange} placeholder='Web fallback oficial (opcional)' />
												<input className='portfolio-input' type='url' name='infoUrl' value={form.infoUrl || ''} onChange={onChange} placeholder='Página oficial de información / rendimiento' />
												<div className='rounded-lg border border-slate-700 p-3 space-y-2'>
													<p className='text-xs font-semibold text-purple-300'>Fuente y verificación</p>
													<input className='portfolio-input' type='url' name='sourceUrl' value={form.sourceUrl || ''} onChange={onChange} placeholder='Fuente oficial usada para verificar' />
													<div className='grid grid-cols-2 gap-2'><label className='text-xs text-gray-300'>Fuente consultada<input className='portfolio-input mt-1' type='date' name='sourceCheckedAt' value={form.sourceCheckedAt || ''} onChange={onChange} /></label><label className='text-xs text-gray-300'>Tasa verificada<input className='portfolio-input mt-1' type='date' name='rateVerifiedAt' value={form.rateVerifiedAt || ''} onChange={onChange} /></label></div>
													<textarea className='portfolio-input' name='interestCalculationBasis' value={form.interestCalculationBasis || ''} onChange={onChange} placeholder='Base / metodología de cálculo' rows='2' />
													<textarea className='portfolio-input' name='interestAccrual' value={form.interestAccrual || ''} onChange={onChange} placeholder='Devengamiento / acreditación' rows='2' />
													<input className='portfolio-input' name='maxInterestBearingBalance' value={form.maxInterestBearingBalance || ''} onChange={onChange} placeholder='Saldo máximo remunerado (número o Sin tope)' />
												</div>
												<input className='portfolio-input' name='liquidity' value={form.liquidity} onChange={onChange} placeholder='Liquidez (ej. inmediata / 24 h)' />
												<input className='portfolio-input' type='number' step='0.01' min='0' name='fees' value={form.fees} onChange={onChange} placeholder='Comisiones estimadas' />
												<div className='grid grid-cols-2 gap-2'>
													<input className='portfolio-input' type='date' name='startDate' value={form.startDate || ''} onChange={onChange} />
													<input className='portfolio-input' type='date' name='maturityDate' value={form.maturityDate || ''} onChange={onChange} />
												</div>
												<textarea className='portfolio-input' name='notes' value={form.notes} onChange={onChange} placeholder='Notas' rows='2' />
											</div>
											<button className='w-full mt-2 py-2.5 rounded-lg bg-primary text-white font-semibold' type='submit'>{editingId ? 'Guardar cambios' : 'Agregar al portfolio'}</button>
											{editingId && <button className='w-full mt-2 py-2 text-sm' type='button' onClick={reset}>Cancelar edición</button>}
										</form>
	);

	return (
		<main className='relative min-h-[calc(100dvh-8.5rem)] bg-zinc-50 dark:bg-gray-900 dark:text-zinc-100 lg:p-8 pb-0 lg:pb-8'>
			<div className='max-w-7xl mx-auto px-4 pt-4 lg:px-0 lg:pt-0 w-full'>
				<div className='flex flex-wrap justify-between items-end gap-4 mb-6'>
					<div>
						<h1 className='text-3xl font-bold'>Cuentas e inversiones</h1>
						<p className='text-gray-500 dark:text-gray-400 max-w-2xl'>Tu patrimonio financiero en un solo lugar. Los totales y rendimientos se mantienen separados por moneda.</p>
					</div>
					{!loading && positions.length > 0 && <div className='flex flex-wrap gap-2'>
						<button type='button' onClick={() => exportPortfolioXlsx(positions, snapshots)} className='inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800'><FaFileExcel /> Excel</button>
						<button type='button' onClick={copyLlmPrompt} className='inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800'><FaFileAlt /> Copiar prompt LLM</button>
					</div>}
				</div>

				{loading ? <div className='space-y-6 animate-pulse' aria-label='Cargando portfolio'><section className='grid grid-cols-3 gap-2 sm:gap-4'>{[0,1,2].map((item) => <div key={item} className='h-28 rounded-xl bg-slate-200 dark:bg-slate-800 border dark:border-slate-700' />)}</section><div className='h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 border dark:border-slate-700' /><div className='space-y-3'><div className='h-7 w-36 rounded bg-slate-200 dark:bg-slate-800' /><div className='h-64 rounded-xl bg-slate-200 dark:bg-slate-800 border dark:border-slate-700' /></div></div> : <>

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
							<p className='text-sm text-green-600 dark:text-green-500 mt-2'>Estimado anual: {money(total.annual, currency)}</p>
							<p className='text-xs text-gray-400'>Estimado mensual: {money(total.annual / 12, currency)}</p>
							<p className='text-xs text-gray-400'>Tasa ponderada: {weightedRates[currency].toFixed(2)}%</p>
						</div>
					))}
					{!Object.keys(totals).length && <div className='text-gray-500'>Todavía no cargaste posiciones.</div>}
					</div>
				</section>

				<PortfolioCharts positions={positions} snapshots={snapshots} />

				<section className='space-y-3 pb-6 lg:pb-8'>
						<div className='flex items-center justify-between'><h2 className='text-xl font-bold'>Posiciones</h2><span className='text-xs text-gray-500'>{positions.length} activas</span></div>
						{loading && <p className='text-gray-500'>Cargando portfolio...</p>}
						{!loading && !positions.length && (
							<div className='border border-dashed dark:border-slate-700 rounded-2xl p-8 text-center'>
								<div className='w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center'><FaWallet /></div>
								<h3 className='font-semibold'>Tu portfolio está vacío</h3>
								<p className='text-sm text-gray-500 mt-1'>Agregá tu primera cuenta o inversión desde el botón +.</p>
								<button type='button' onClick={() => setShowForm(true)} className='mt-4 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors'>Agregar posición</button>
							</div>
						)}
						{!loading && positions.map((position) => (
							<article key={position.id} className='bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5 shadow-sm'>
								<div className='flex flex-wrap justify-between gap-4'>
									<div>
										<p className='text-sm font-bold uppercase tracking-wide text-purple-500'>{position.institution}</p>
										<div className='flex items-center gap-2 mt-1'>
											<h3 className='text-xl sm:text-2xl font-bold leading-tight'><Link className='hover:text-purple-400' to={`/portfolio/${position.id}`}>{position.name}</Link></h3>
											{position.notes && <InfoTooltip placement='top' content={position.notes} />}
										</div>
										<p className='text-xs uppercase text-gray-400 mt-1'>{position.category}</p>
										<p className='text-3xl font-bold mt-3'>{money(position.balance, position.currency)}</p>
									</div>
									<div className='text-right'>
										<p className='text-xs uppercase tracking-wide text-gray-400'>Rendimiento</p>
										<p className='text-2xl font-bold text-green-600 dark:text-green-500'>{Number(position.annualRate || 0).toFixed(2)}% <span className='text-sm'>{position.rateType || ''}</span></p>
										<p className='text-sm text-gray-500'>{position.liquidity || 'Liquidez no informada'}</p>
										<p className='text-sm text-green-600 mt-1'>≈ {money(Number(position.balance || 0) * Number(position.annualRate || 0) / 100 / 12, position.currency)} / mes proyectado</p>
										{position.trackingMode === 'DAILY_RATE' && <p className='text-xs text-gray-400'>Esperado hoy: {money(Number(position.balance || 0) * Number(position.annualRate || 0) / 100 / 365, position.currency)}</p>}
										{position.trackingMode === 'MATURITY' && position.maturityDate && <p className='text-xs text-gray-400'>Seguimiento al vencimiento: {position.maturityDate}</p>}
										<p className='text-xs text-gray-400'>Tracking: {position.trackingMode || 'MANUAL'}</p>
										{position.category === 'FCI' && position.ticker && <p className='text-xs text-gray-400'>Ticker: {position.ticker}</p>}
										{position.category === 'FCI' && Number(position.nav || 0) > 0 && <p className='text-xs text-gray-400'>NAV: {Number(position.nav).toFixed(5)} {position.navDate ? `· ${position.navDate}` : ''}</p>}
										{position.category === 'FCI' && Number(position.performance1Y || 0) !== 0 && <p className='text-xs text-green-600 dark:text-green-500'>Rend. 1A: {Number(position.performance1Y).toFixed(2)}%</p>}
										{position.category === 'FCI' && position.monthlyReturns && Object.keys(position.monthlyReturns).length > 0 && <p className='text-sm font-bold text-green-600 dark:text-green-400'>YTD compuesto: {((Object.values(position.monthlyReturns).map(Number).filter(Number.isFinite).reduce((factor, value) => factor * (1 + value / 100), 1) - 1) * 100).toFixed(2)}%</p>}
										{Number(position.realizedEarnings || 0) !== 0 && <p className='text-sm font-semibold text-green-600 dark:text-green-500 mt-1'>Ganado: {money(position.realizedEarnings, position.currency)}</p>}
										{Number(position.lastEarning || 0) !== 0 && <p className='text-xs text-gray-400'>Último rendimiento: {money(position.lastEarning, position.currency)}</p>}
										{Number(position.effectiveRate || 0) > 0 && <p className='text-xs text-gray-400'>Tasa efectiva: {Number(position.effectiveRate).toFixed(2)}%</p>}
										{performanceByPosition[position.id] && (
											<div className='mt-2 text-sm'>
												<p className={performanceByPosition[position.id].change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}>
													Cambio observado: {money(performanceByPosition[position.id].change, position.currency)} ({performanceByPosition[position.id].percent.toFixed(2)}%)
												</p>
												<p className='text-xs text-gray-400'>{performanceByPosition[position.id].count} snapshots</p>
											</div>
										)}
									</div>
								</div>
								<div className='flex flex-col gap-3 mt-4'>
									<button className='w-full px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold' onClick={() => requestVerify(position)}>Verificar saldo</button>
									<div className='flex items-center gap-3 w-full'>
										{position.infoUrl && <button title='Información oficial del activo' aria-label='Información oficial del activo' className='w-10 h-10 inline-flex items-center justify-center rounded-lg border dark:border-slate-600 hover:text-blue-400' onClick={() => openInfo(position)}><FaBookOpen /></button>}
										{(position.category === 'Cuenta remunerada' || /earn\s*vault/i.test(`${position.name || ''} ${position.category || ''}`)) && <button title='Actualizar tasa rápidamente' aria-label='Actualizar tasa rápidamente' className='w-10 h-10 inline-flex items-center justify-center rounded-lg border dark:border-slate-600 hover:text-green-400' onClick={() => requestRateUpdate(position)}><FaPercent /></button>}
										{(position.appUrl || position.webUrl) && <button title='Abrir app / web' aria-label='Abrir app o web' className='w-10 h-10 inline-flex items-center justify-center rounded-lg border dark:border-slate-600' onClick={() => openInstitution(position)}><FaExternalLinkAlt /></button>}
										<button title='Editar posición' aria-label='Editar posición' className='w-10 h-10 inline-flex items-center justify-center rounded-lg border dark:border-slate-600 hover:text-purple-500' onClick={() => edit(position)}><FaPencilAlt /></button>
										<button title='Eliminar posición' aria-label='Eliminar posición' className='w-10 h-10 inline-flex items-center justify-center rounded-lg text-red-500 border border-red-300 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30' onClick={() => requestDelete(position)}><FaTrashAlt /></button>
									</div>
								</div>
							</article>
						))}
					</section>
				</>}
			</div>
			{!loading && <AppFooter />}

			<GenericModal
				show={showForm}
				component={portfolioFormContent}
				closeModal={reset}
			/>

			<GenericModal
				show={Boolean(verifyTarget)}
				component={() => (
					<div className='text-white pr-8'>
						<h2 className='text-xl font-bold'>Confirmar saldo</h2>
						<p className='mt-2 text-sm text-gray-300'>Ingresá el saldo actual de <strong>{verifyTarget?.name}</strong>. Al confirmar también se guardará un snapshot para el histórico.</p>
						<input autoFocus className='portfolio-input mt-4' type='number' step='0.01' min='0' value={verifyBalance} onChange={(event) => setVerifyBalance(event.target.value)} placeholder='Saldo actual' />
						<div className='grid grid-cols-2 gap-2 mt-5'>
							<button type='button' onClick={() => setVerifyTarget(null)} className='py-2.5 rounded-lg border border-slate-600 font-semibold'>Cancelar</button>
							<button type='button' disabled={verifyBalance === '' || pendingAction === 'verify'} onClick={verify} className='py-2.5 rounded-lg bg-ltc-green disabled:opacity-40 text-white font-semibold'>Confirmar saldo</button>
						</div>
					</div>
				)}
				closeModal={() => setVerifyTarget(null)}
			/>

			<GenericModal show={Boolean(rateTarget)} component={() => (<div className='text-white pr-8'><div className='w-12 h-12 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center mb-4'><FaPercent /></div><h2 className='text-xl font-bold'>Actualizar tasa</h2><p className='mt-2 text-sm text-gray-300'><strong>{rateTarget?.institution}</strong> · {rateTarget?.name}</p><p className='mt-1 text-xs text-gray-400'>Actualizá solamente la tasa. El resto de la posición no cambia.</p><div className='relative mt-4'><input autoFocus className='portfolio-input pr-10 text-xl font-bold' type='number' step='0.01' min='0' value={quickRate} onChange={(event) => setQuickRate(event.target.value)} placeholder='Tasa anual' /><span className='absolute right-3 top-2.5 font-bold text-gray-400'>%</span></div><div className='grid grid-cols-2 gap-2 mt-5'><button type='button' onClick={() => setRateTarget(null)} className='py-2.5 rounded-lg border border-slate-600 font-semibold'>Cancelar</button><button type='button' disabled={quickRate === '' || pendingAction === 'rate'} onClick={saveQuickRate} className='py-2.5 rounded-lg bg-ltc-green disabled:opacity-40 text-white font-semibold inline-flex items-center justify-center gap-2'>{pendingAction === 'rate' && <span className='w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin' />}{pendingAction === 'rate' ? 'Guardando…' : 'Guardar tasa'}</button></div></div>)} closeModal={() => setRateTarget(null)} />

			<GenericModal
				show={Boolean(deleteTarget)}
				component={() => (
					<div className='text-white pr-8'>
						<div className='w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mb-4'><FaTrashAlt /></div>
						<h2 className='text-xl font-bold'>Eliminar posición</h2>
						<p className='mt-2 text-sm text-gray-300'>¿Seguro que querés eliminar <strong>{deleteTarget?.name}</strong> de {deleteTarget?.institution}? Esta acción no se puede deshacer.</p>
						<div className='grid grid-cols-2 gap-2 mt-5'>
							<button type='button' onClick={() => setDeleteTarget(null)} className='py-2.5 rounded-lg border border-slate-600 font-semibold'>Cancelar</button>
							<button type='button' disabled={pendingAction === 'delete'} onClick={remove} className='py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold inline-flex items-center justify-center gap-2'>{pendingAction === 'delete' && <span className='w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin' />}{pendingAction === 'delete' ? 'Eliminando…' : 'Eliminar'}</button>
						</div>
					</div>
				)}
				closeModal={() => setDeleteTarget(null)}
			/>

			{!loading && !showForm && (
				<PrimaryFab onClick={() => setShowForm(true)} ariaLabel='Agregar posición' />
			)}

		</main>
	);
}

export default Portfolio;
