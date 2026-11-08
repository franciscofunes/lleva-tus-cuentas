import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Reorder } from 'framer-motion';
import PageDataSkeleton from '../components/PageDataSkeleton';
import FinancialOverviewPanel from '../components/FinancialOverviewPanel';
import { FaWallet, FaChartLine, FaRegClock, FaPencilAlt, FaTrashAlt, FaExternalLinkAlt, FaBookOpen, FaPercent, FaFileExcel, FaFileAlt, FaPlus, FaExchangeAlt, FaUniversity } from 'react-icons/fa';
import QuickAccessCard from '../components/QuickAccessCard';
import FinancialHeaderActions from '../components/FinancialHeaderActions';
import ScreenshotImportShortcut from '../components/ScreenshotImportShortcut';
import { FINANCIAL_RECORD_DISCLOSURE_STYLES } from '../components/CollapsibleHeading';
import { FaChevronDown } from 'react-icons/fa';
import CollapsibleSection from '../components/CollapsibleSection';
import InfoTooltip from '../components/InfoTooltip';
import PortfolioCharts from '../components/PortfolioCharts';
import GenericModal from '../components/GenericModal';
import LocalScreenshotOcr from '../components/LocalScreenshotOcr';
import LitaAssistantPanel from '../components/LitaAssitantPanel';
import FloatingMenu from '../components/FloatingMenu';
import SortablePortfolioPositionCard from '../components/SortablePortfolioPositionCard';
import { parsePortfolioMarkdown } from '../utils/portfolioMarkdown';
import { preparePortfolioOcrText } from '../utils/localPortfolioOcr';
import { preparePortfolioExport, buildPortfolioLlmMarkdown } from '../utils/portfolioExport';
import PortfolioExportReady from '../components/PortfolioExportReady';
import { auditPortfolioEarnings } from '../utils/portfolioEarningsAudit';
import { sortedAccountSnapshots, summarizeAccountActivity } from '../utils/portfolioAccountActivity';
import { formattedPublishedReturn, parsePublishedReturn, publishedReturnTone, summarizePublishedReturns } from '../utils/portfolioPublishedReturns';
import eyeHide from '../imgs/eyeHide.svg';
import closeEye from '../imgs/closeEye.svg';
import {
	createPortfolioPosition,
	deletePortfolioPosition,
	subscribePortfolioPositions,
	subscribePortfolioSnapshots,
	reorderPortfolioPositions,
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
	depositAccruedInterest: '',
	depositTotalInterest: '',
	depositContractNumber: '',
	depositAutoRenewal: '',
	startDate: '',
	maturityDate: '',
	notes: '',
	trackingMode: 'DAILY_RATE',
	appUrl: '',
	webUrl: '',
	infoUrl: '',
	accountHolder: '',
	accountNumber: '',
	accountType: '',
	cbu: '',
	alias: '',
	routingNumber: '',
	swift: '',
	bankName: '',
	bankAddress: '',
	depositInstructions: '',
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

// Quick-action dialogs use the same light/dark language as Transactions.
// GenericModal supplies the surface; its children must not force white text in light mode.
const portfolioDialog = {
	content: 'min-w-0 pr-8 font-sans text-slate-900 dark:text-slate-50',
	description: 'mt-2 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200',
	muted: 'text-xs leading-relaxed text-slate-600 dark:text-slate-300',
	label: 'block text-sm font-semibold text-slate-700 dark:text-slate-200',
	field: 'portfolio-input min-h-[44px] text-base sm:text-sm',
	cancel: 'min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
	cancelDestructive: 'min-h-[44px] rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60',
	save: 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60',
	danger: 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500 px-3 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/70 dark:text-rose-300 dark:hover:bg-rose-950/30',
};

const money = (value, currency) =>
	new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency,
		maximumFractionDigits: currency === 'ARS' ? 0 : 2,
	}).format(Number(value || 0));

const DEPOSIT_IMPORT_FIELDS = new Set(['depositAccruedInterest', 'depositTotalInterest', 'depositContractNumber', 'depositAutoRenewal']);
const IMPORT_FIELD_LABELS = {
	depositAccruedInterest: 'Intereses devengados (sin acreditar)',
	depositTotalInterest: 'Intereses totales previstos al vencimiento',
	depositContractNumber: 'Número de contrato',
	depositAutoRenewal: 'Renovación automática',
};

const modalPublishedRateTone = (value) => value == null || value === 0
	? 'text-slate-700 dark:text-slate-100'
	: value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300';

// Cash with no reported annual return is liquid principal, not a yield-bearing product.
const isCashWithoutYield = (position) => position?.category === 'Cash'
	&& Number(position.annualRate || 0) === 0;

function Portfolio() {
	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);
	const [positions, setPositions] = useState([]);
	const positionsRef = useRef([]);
	const [snapshots, setSnapshots] = useState([]);
	const [preparedPortfolioExport, setPreparedPortfolioExport] = useState(null);
	const preparedPortfolioExportRef = useRef(null);
	const clearPreparedPortfolioExport = useCallback(() => {
		const previous = preparedPortfolioExportRef.current;
		preparedPortfolioExportRef.current = null;
		setPreparedPortfolioExport(null);
		if (previous) {
			URL.revokeObjectURL(previous.xlsxUrl);
			URL.revokeObjectURL(previous.csvUrl);
		}
	}, []);
	// Revoke private blob URLs on logout, data changes and leaving the page.
	useEffect(() => {
		clearPreparedPortfolioExport();
	}, [user?.uid, positions, snapshots, clearPreparedPortfolioExport]);
	useEffect(() => () => {
		const previous = preparedPortfolioExportRef.current;
		if (previous) {
			URL.revokeObjectURL(previous.xlsxUrl);
			URL.revokeObjectURL(previous.csvUrl);
			preparedPortfolioExportRef.current = null;
		}
	}, []);
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);
	const [loading, setLoading] = useState(true);
	const [positionsLoaded, setPositionsLoaded] = useState(false);
	const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [showLita, setShowLita] = useState(false);
	const [markdownImport, setMarkdownImport] = useState('');
	const [showMarkdownImport, setShowMarkdownImport] = useState(false);
	const [screenshotTargetId, setScreenshotTargetId] = useState('');
	const [importPreview, setImportPreview] = useState([]);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [verifyTarget, setVerifyTarget] = useState(null);
	const [verifyBalance, setVerifyBalance] = useState('');
	const [verifyChangeType, setVerifyChangeType] = useState('earning');
	const [verifyNote, setVerifyNote] = useState('');
	const [verifyNav, setVerifyNav] = useState('');
	const [verifyReportedEarnings, setVerifyReportedEarnings] = useState('');
	const [rateTarget, setRateTarget] = useState(null);
		const [quickRate, setQuickRate] = useState('');
	const [pendingAction, setPendingAction] = useState('');
	const preferenceKey = user?.uid ? `ltc:portfolio:view:${user.uid}` : 'ltc:portfolio:view';
	const [hideValues, setHideValues] = useState(() => {
		try { return JSON.parse(localStorage.getItem('ltc:portfolio:view:guest') || '{}').hideValues || false; } catch { return false; }
	});
	const [collapsedSections, setCollapsedSections] = useState({ overview:false, summary:false, charts:false, positions:false });
	const [expandedPositionIds, setExpandedPositionIds] = useState({});
	const [preferencesLoadedFor, setPreferencesLoadedFor] = useState(null);
	

	useEffect(() => {
		setPreferencesLoadedFor(null);
		if (!user?.uid) return;
		try {
			const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
			setHideValues(Boolean(saved.hideValues));
			setCollapsedSections({ overview:false, summary:false, charts:false, positions:false, ...(saved.collapsedSections || {}) });
		} catch {
			setCollapsedSections({ overview:false, summary:false, charts:false, positions:false });
		} finally {
			setPreferencesLoadedFor(user.uid);
		}
	}, [user?.uid, preferenceKey]);

	useEffect(() => {
		if (!user?.uid || preferencesLoadedFor !== user.uid) return;
		try {
			localStorage.setItem(preferenceKey, JSON.stringify({ hideValues, collapsedSections }));
		} catch {
			// Private mode and some browsers may block storage; collapse still works in memory.
		}
	}, [user?.uid, preferenceKey, preferencesLoadedFor, hideValues, collapsedSections]);

	const togglePortfolioSection = (section) => setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
	const privateMoney = (value, currency) => hideValues ? '••••••' : money(value, currency);
	const privatePercent = (value, suffix = '%') => hideValues ? '••••' : `${Number(value || 0).toFixed(2)}${suffix}`;
	const privateReportedRate = (raw) => hideValues ? '••••' : formattedPublishedReturn(parsePublishedReturn(raw));
	const reportedRateTone = (raw) => hideValues ? 'text-slate-900 dark:text-slate-50' : publishedReturnTone(parsePublishedReturn(raw));
	const privateCount = (value) => hideValues ? '••' : value;

	useEffect(() => {
		if (!user) return undefined;
		return subscribePortfolioPositions(
			user.uid,
			(data) => {
				positionsRef.current = data;
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
		positionsRef.current = positions;
	}, [positions]);

	const handleReorderPositions = (nextPositions) => {
		positionsRef.current = nextPositions;
		setPositions(nextPositions);
	};

	const persistPositionOrder = async () => {
		if (!user?.uid || positionsRef.current.length < 2) return;
		try {
			await reorderPortfolioPositions(user.uid, positionsRef.current);
		} catch (error) {
			toast.error('No se pudo guardar el orden del portfolio');
		}
	};

	const movePositionWithKeyboard = async (positionId, direction) => {
		const current = positionsRef.current;
		const index = current.findIndex((position) => position.id === positionId);
		const targetIndex = index + direction;
		if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return;

		const next = [...current];
		const [moved] = next.splice(index, 1);
		next.splice(targetIndex, 0, moved);
		handleReorderPositions(next);
		await persistPositionOrder();
	};

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
			const chronologically = sortedAccountSnapshots(history);
			const first = chronologically[0];
			const last = chronologically[chronologically.length - 1];
			const change = Number(last.balance || 0) - Number(first.balance || 0);
			const percent = Number(first.balance || 0) > 0
				? (change / Number(first.balance)) * 100
				: 0;
			acc[positionId] = { change, percent, count: history.length };
			return acc;
		}, {});
	}, [snapshots]);


	const accountActivityByPosition = useMemo(() => positions.reduce((acc, position) => {
		if (position.category === 'Cuenta remunerada' || position.trackingMode === 'DAILY_RATE') {
			acc[position.id] = summarizeAccountActivity(position, snapshots.filter((row)=>row.positionId === position.id));
		}
		return acc;
	}, {}), [positions, snapshots]);

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

	const litaPortfolioContext = useMemo(() => ({
		scope: 'portfolio-current-state',
		totals,
		weightedRates,
		positions: positions.map((position) => ({
			institution: position.institution || '',
			name: position.name || '',
			category: position.category || '',
			currency: position.currency || '',
			balance: Number(position.balance || 0),
			annualRate: Number(position.annualRate || 0),
			rateType: position.rateType || '',
			liquidity: position.liquidity || '',
			principal: Number(position.principal || 0),
			realizedEarnings: Number(position.realizedEarnings || 0),
			earningsAudit: auditPortfolioEarnings(position, snapshots),
			effectiveRate: Number(position.effectiveRate || 0),
			trackingMode: position.trackingMode || '',
			maturityDate: position.maturityDate || '',
			ticker: position.ticker || '',
			nav: Number(position.nav || 0),
			navDate: position.navDate || '',
			performanceYTD: Number(position.performanceYTD || 0),
			performance1Y: Number(position.performance1Y || 0),
			monthlyReturns: position.monthlyReturns || {},
		})),
		recentSnapshots: snapshots.slice(-40).map((snapshot) => ({
			positionId: snapshot.positionId || '',
			date: snapshot.date || snapshot.createdAt || '',
			balance: Number(snapshot.balance || 0),
			currency: snapshot.currency || '',
			nav: Number(snapshot.nav || 0),
			changeType: snapshot.changeType || 'unclassified',
			observedBalanceChange: Number(snapshot.observedEarning || 0),
			userTaggedEarnings: Number(snapshot.confirmedEarning || 0),
			cashFlow: Number(snapshot.cashFlow || 0),
			note: snapshot.note || '',
		})),
	}), [positions, snapshots, totals, weightedRates]);

	if (isFetching) return <main className='min-h-[calc(100dvh-8.5rem)] bg-zinc-50 dark:bg-gray-900 dark:text-zinc-100 px-4 pt-4 pb-28 lg:p-8'><div className='max-w-7xl mx-auto w-full space-y-6 animate-pulse' aria-label='Cargando portfolio'><div className='space-y-2'><div className='h-9 w-72 max-w-[80%] rounded-lg bg-slate-200 dark:bg-slate-800' /><div className='h-5 w-full max-w-2xl rounded bg-slate-200 dark:bg-slate-800' /></div><section className='grid grid-cols-3 gap-2 sm:gap-4'>{[0,1,2].map((item) => <div key={item} className='h-28 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700' />)}</section><div className='space-y-3'><div className='h-7 w-44 rounded bg-slate-200 dark:bg-slate-800' /><div className='h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700' /></div><div className='space-y-3'><div className='h-7 w-36 rounded bg-slate-200 dark:bg-slate-800' /><div className='h-64 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700' /></div></div></main>;
	if (!user) return <Navigate to='/' />;

	const onChange = (event) =>
		setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

	const monthKeys = [['jan','Ene'],['feb','Feb'],['mar','Mar'],['apr','Abr'],['may','May'],['jun','Jun'],['jul','Jul'],['aug','Ago'],['sep','Sep'],['oct','Oct'],['nov','Nov'],['dec','Dic']];
	const monthLabelByKey = Object.fromEntries(monthKeys);
	const monthlySummary = summarizePublishedReturns(form.monthlyReturns);
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
			const flatEntries = Object.entries(parsed).flatMap(([field, value]) => {
				if (field !== 'monthlyReturns' || !value || typeof value !== 'object') {
					return [[field, value]];
				}
				return Object.entries(value).map(([month, monthValue]) => [`monthlyReturns.${month}`, monthValue]);
			});
			const preview = flatEntries.filter(([field]) => !DEPOSIT_IMPORT_FIELDS.has(field) || form.category === 'Plazo fijo').map(([field, value]) => {
				const month = field.startsWith('monthlyReturns.') ? field.split('.')[1] : null;
				const current = month ? form.monthlyReturns?.[month] : form[field];
				const missing = current === '' || current == null;
				return { field, value, current, missing, changed: String(current ?? '') !== String(value ?? ''), selected: missing };
			}).filter((item) => item.changed);
			setImportPreview(preview);
			if (!preview.length) toast.info('Los datos reconocidos ya coinciden con esta posición.');
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
		setForm((current) => selected.reduce((next, item) => {
			if (item.field.startsWith('monthlyReturns.')) {
				const month = item.field.split('.')[1];
				return {
					...next,
					monthlyReturns: {
						...(next.monthlyReturns || {}),
						[month]: item.value,
					},
				};
			}
			return { ...next, [item.field]: item.value };
		}, current));
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
		setMarkdownImport('');
		setImportPreview([]);
		setShowMarkdownImport(false);
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
			depositAccruedInterest: String(position.depositAccruedInterest ?? ''),
			depositTotalInterest: String(position.depositTotalInterest ?? ''),
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

	const openScreenshotImport = () => {
		if (screenshotTargetId === '__new__') {
			reset();
			setShowForm(true);
		} else {
			const target = positions.find((position) => position.id === screenshotTargetId);
			if (!target) return;
			edit(target);
		}
		setMarkdownImport('');
		setImportPreview([]);
		setShowMarkdownImport(true);
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
		const isNav = position.trackingMode === 'NAV' || position.category === 'FCI';
		setVerifyTarget(position);
		setVerifyBalance(String(position.balance || ''));
		setVerifyChangeType('unclassified');
		setVerifyNote('');
		setVerifyNav(isNav ? String(position.nav ?? '') : '');
		setVerifyReportedEarnings(isNav ? String(position.realizedEarnings ?? 0) : '');
	};

	const verify = async () => {
		if (!verifyTarget || pendingAction) return;
		const isNav = verifyTarget.trackingMode === 'NAV' || verifyTarget.category === 'FCI';
		const hasShares = Number(verifyTarget.shares || 0) > 0;
		if (isNav ? (verifyNav === '' || (!hasShares && verifyBalance === '')) : verifyBalance === '') return;
		setPendingAction('verify');
		try {
			await verifyPortfolioPosition(user.uid, verifyTarget, verifyBalance, {
				changeType: verifyChangeType,
				note: verifyNote,
				nav: verifyNav,
				reportedEarnings: isNav ? verifyReportedEarnings : undefined,
			});
			toast.success(isNav ? 'Cuotaparte, valuación y ganado informado actualizados' : 'Saldo verificado y snapshot guardado');
			if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
			setVerifyTarget(null);
			setVerifyBalance('');
			setVerifyNote('');
			setVerifyNav('');
			setVerifyReportedEarnings('');
		} catch (error) {
			toast.error(error.message || (isNav ? 'No se pudo actualizar la cuotaparte' : 'No se pudo verificar el saldo'));
		} finally {
			setPendingAction('');
		}
	};

	const requestRateUpdate = (position) => { setRateTarget(position); setQuickRate(String(position.annualRate ?? '')); };
	const saveQuickRate = async () => { if (!rateTarget || quickRate === '' || pendingAction) return; setPendingAction('rate'); try { await updatePortfolioPosition(user.uid, rateTarget.id, { ...rateTarget, annualRate: quickRate }); toast.success(`Tasa de ${rateTarget.institution} actualizada a ${Number(quickRate).toFixed(2)}%`); setRateTarget(null); setQuickRate(''); } catch (error) { toast.error('No se pudo actualizar la tasa'); } finally { setPendingAction(''); } };
	const openPortfolioExport = () => {
		if (loading || !positions.length) return;
		try {
			const files = preparePortfolioExport(positions, snapshots);
			const xlsxUrl = URL.createObjectURL(files.xlsxBlob);
			let csvUrl;
			try {
				csvUrl = URL.createObjectURL(files.csvBlob);
			} catch (error) {
				URL.revokeObjectURL(xlsxUrl);
				throw error;
			}
			clearPreparedPortfolioExport();
			const prepared = { ...files, xlsxUrl, csvUrl };
			preparedPortfolioExportRef.current = prepared;
			setPreparedPortfolioExport(prepared);
		} catch (error) {
			console.error('[ltc-export] Portfolio file preparation failed', error?.name || 'Error');
			toast.error('No se pudo preparar el portfolio. Volvé a intentarlo.');
		}
	};
	const copyLlmPrompt = async () => {
		try {
			await navigator.clipboard.writeText(buildPortfolioLlmMarkdown(positions, snapshots));
			toast.success('Análisis para LITA copiado. Abrí LITA y pegalo en el chat.');
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


	const isNavVerification = Boolean(
		verifyTarget && (verifyTarget.trackingMode === 'NAV' || verifyTarget.category === 'FCI')
	);
	const verifyShares = Number(verifyTarget?.shares || 0);
	const verifyNavNumber = Number(verifyNav || 0);
	const calculatedNavBalance =
		isNavVerification && verifyShares > 0 && verifyNavNumber > 0
			? verifyShares * verifyNavNumber
			: null;
	const currentNav = Number(verifyTarget?.nav || 0);
	const navVariationPercent =
		isNavVerification && currentNav > 0 && verifyNavNumber > 0
			? ((verifyNavNumber / currentNav) - 1) * 100
			: null;

	const portfolioFormContent = (
		<form onSubmit={submit} data-testid='portfolio-position-form' className='min-w-0 space-y-3 text-slate-900 dark:text-slate-50'>
										<h2 className='text-lg font-bold pr-10 mb-2'>{editingId ? 'Editar posición' : 'Nueva posición'}</h2>
										<div className='mb-2'>
											<button type='button' aria-expanded={showMarkdownImport} onClick={() => setShowMarkdownImport((value) => !value)} className='min-h-[44px] w-full rounded-xl border border-violet-500 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:bg-slate-800 dark:text-violet-200'>{showMarkdownImport ? 'Ocultar importador' : editingId ? 'Enriquecer posición desde captura o Markdown' : 'Importar desde captura o Markdown'}</button>
											{showMarkdownImport && <div className='mt-2 min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70'>
												{hideValues ? <div className='space-y-2 rounded-lg border border-amber-500 p-3 text-sm text-amber-800 dark:border-amber-700 dark:text-amber-200'><p role='status'>Mostrá los importes del Portfolio para analizar una captura y comparar campos.</p><button type='button' onClick={()=>setHideValues(false)} className='min-h-[44px] rounded-xl border border-violet-500 px-3 py-2 text-sm font-semibold text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:text-violet-200'>Mostrar importes y continuar</button></div> : <>
													<LocalScreenshotOcr onRecognized={({text})=>{setMarkdownImport(preparePortfolioOcrText(text));setImportPreview([]);}} privacyHidden={hideValues} disabled={pendingAction==='save'}/>
													<label className='block text-sm font-semibold text-slate-900 dark:text-slate-100'>Texto reconocido o Markdown
														<textarea aria-label='Texto para enriquecer posición' className='portfolio-input mt-2 min-h-[120px] text-sm' value={markdownImport} onChange={(event) => { setMarkdownImport(event.target.value); setImportPreview([]); }} placeholder={'Podés leer una captura o pegar datos publicados.\n\nEjemplo FCI:\nRentabilidad mensual 2026:\n- Ene: 0,62%\n- Feb: 0,29%\n- Mar: 0,95%\nTotal YTD publicado: 3,75%'} />
													</label>
													<p className='text-xs text-slate-600 dark:text-slate-300'>Revisá los valores detectados y elegí qué campos aplicar. Los cambios de saldo no son ganancias.</p>
													<button type='button' disabled={!markdownImport.trim()} onClick={importMarkdown} className='min-h-[44px] w-full rounded-xl bg-secondary px-3 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-40'>Comparar datos detectados</button>
												</>}
												{!hideValues && importPreview.length > 0 && <div className='mt-3 space-y-2'>
													<div className='flex flex-wrap gap-2'>{[['missing','Solo faltantes'],['all','Todos los cambios'],['none','Ninguno']].map(([choice,label]) => <button key={choice} type='button' onClick={() => selectImportFields(choice)} className='min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600'>{label}</button>)}</div>
																	{importPreview.map((item) => <label key={item.field} className='flex min-h-[44px] cursor-pointer gap-3 rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700'><input type='checkbox' checked={item.selected} onChange={() => toggleImportField(item.field)} /><span className='min-w-0'><strong>{item.field.startsWith('monthlyReturns.') ? `Rentabilidad ${monthLabelByKey[item.field.split('.')[1]] || item.field.split('.')[1].toUpperCase()}` : IMPORT_FIELD_LABELS[item.field] || item.field}</strong>{item.missing && <span className='ml-2 text-xs text-emerald-700 dark:text-emerald-400'>FALTANTE</span>}<span className='block break-all text-xs text-slate-600 dark:text-slate-400'>{String(item.current ?? '') || '—'} → <span className='text-slate-900 dark:text-white'>{String(item.value)}</span></span></span></label>)}
																	{importPreview.some(item => DEPOSIT_IMPORT_FIELDS.has(item.field)) && <p className='text-xs text-slate-700 dark:text-slate-300'>Los intereses informados por el banco no aumentan el saldo ni las ganancias realizadas. Para reemplazar datos existentes, marcá sus casillas.</p>}
													<button type='button' onClick={applyImportFields} className='min-h-[44px] w-full rounded-lg bg-ltc-green px-3 py-2 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500'>Aplicar campos seleccionados</button>
												</div>}
											</div>}
										</div>
											
											<div className='space-y-2'>
												<input className='portfolio-input' name='institution' value={form.institution} onChange={onChange} placeholder='Institución / plataforma' required />
												<input className='portfolio-input' name='name' value={form.name} onChange={onChange} placeholder='Producto / cuenta' required />
												<select aria-label='Tipo de activo' className='portfolio-input' name='category' value={form.category} onChange={onChange}>
													{['Cuenta remunerada','Plazo fijo','FCI','ETF','Crypto / staking','Cash','Carry trade','Otro'].map((item) => <option key={item}>{item}</option>)}
												</select>
												<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
													<select aria-label='Moneda de la posición' className='portfolio-input' name='currency' value={form.currency} onChange={onChange}>
														<option>ARS</option><option>USD</option><option>EUR</option><option>USDT</option>
													</select>
													<input className='portfolio-input' type='number' step='0.01' min='0' name='balance' value={form.balance} onChange={onChange} placeholder='Capital actual' required />
												</div>
												<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
													<input aria-label='Tasa anual informada' className='portfolio-input' type='number' step='0.01' min='0' name='annualRate' value={form.annualRate} onChange={onChange} placeholder='Tasa anual %' />
													<select className='portfolio-input' name='rateType' value={form.rateType} onChange={onChange}><option>TNA</option><option>TEA</option><option>TIR</option><option>APY</option><option>Variable</option></select>
												</div>
											<select aria-label='Modo de seguimiento' className='portfolio-input' name='trackingMode' value={form.trackingMode || 'MANUAL'} onChange={onChange}>
													<option value='DAILY_RATE'>Cuenta remunerada · diario</option>
													<option value='MATURITY'>Plazo fijo · vencimiento</option>
													<option value='NAV'>FCI · valuación</option>
													<option value='MANUAL'>Manual</option>
												</select>
												{form.category === 'FCI' && (
													<div className='space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700'>
														<p className='text-xs font-semibold text-violet-700 dark:text-purple-300'>Datos específicos del FCI</p>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' name='ticker' value={form.ticker} onChange={onChange} placeholder='Ticker / clase' /><input className='portfolio-input' name='redemptionPeriod' value={form.redemptionPeriod} onChange={onChange} placeholder='Rescate (ej. 24h)' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='number' step='any' min='0' name='shares' value={form.shares} onChange={onChange} placeholder='Cuotapartes' /><input className='portfolio-input' type='number' step='any' min='0' name='nav' value={form.nav} onChange={onChange} placeholder='Valor cuotaparte / NAV' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='date' name='navDate' value={form.navDate} onChange={onChange} /><input className='portfolio-input' type='number' step='any' min='0' name='minimumInvestment' value={form.minimumInvestment} onChange={onChange} placeholder='Inversión mínima' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='number' step='any' name='performance1D' value={form.performance1D} onChange={onChange} placeholder='Rend. 1D %' /><input className='portfolio-input' type='number' step='any' name='performance1W' value={form.performance1W} onChange={onChange} placeholder='Rend. 1S %' /></div>
														<div className='grid grid-cols-3 gap-2'><input className='portfolio-input' type='number' step='any' name='performance1M' value={form.performance1M} onChange={onChange} placeholder='1M %' /><input className='portfolio-input' type='number' step='any' name='performanceYTD' value={form.performanceYTD} onChange={onChange} placeholder='YTD %' /><input className='portfolio-input' type='number' step='any' name='performance1Y' value={form.performance1Y} onChange={onChange} placeholder='1A %' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' name='fundType' value={form.fundType} onChange={onChange} placeholder='Tipo (ej. Renta fija)' /><input className='portfolio-input' name='investmentHorizon' value={form.investmentHorizon} onChange={onChange} placeholder='Horizonte' /></div>
														<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' type='date' name='fundStartDate' value={form.fundStartDate} onChange={onChange} /><input className='portfolio-input' name='rating' value={form.rating} onChange={onChange} placeholder='Calificación' /></div>
														<input className='portfolio-input' type='number' step='any' min='0' name='volatility21dAnnualized' value={form.volatility21dAnnualized} onChange={onChange} placeholder='Volatilidad 21d anualizada %' />
														<div className='space-y-3 rounded-lg border border-slate-300 p-3 dark:border-slate-600'>
															<div><p className='text-sm font-bold text-slate-900 dark:text-white'>Rentabilidad mensual</p><p className='text-xs text-slate-600 dark:text-slate-300'>Cargá porcentajes publicados por el fondo. Un mes vacío no equivale a 0%. Los acumulados usan solo los meses informados, no representan ganancias realizadas.</p></div>
															<div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>{monthKeys.map(([key,label]) => <label key={key} className='min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200'>{label}<input className='portfolio-input mt-1' type='number' step='0.01' value={form.monthlyReturns?.[key] ?? ''} onChange={(event) => onMonthlyReturnChange(key, event.target.value)} placeholder='Sin dato' /></label>)}</div>
															{monthlySummary.entries.length === 0 && <p className='text-xs text-slate-600 dark:text-slate-300' role='status'>Sin rentabilidades mensuales cargadas.</p>}
											<div className='grid grid-cols-2 gap-2'>
																<div className='min-w-0 rounded-lg bg-slate-100 p-2 dark:bg-slate-800'><p className='text-xs text-slate-600 dark:text-slate-300'>Suma simple</p><p className={`break-words font-bold tabular-nums ${hideValues ? 'text-slate-900 dark:text-slate-100' : modalPublishedRateTone(monthlySummary.simple)}`}>{privateReportedRate(monthlySummary.simple)}</p></div>
																<div className='min-w-0 rounded-lg bg-slate-100 p-2 dark:bg-slate-800'><p className='text-xs text-slate-600 dark:text-slate-300'>Acumulado compuesto</p><p className={`break-words font-bold tabular-nums ${hideValues ? 'text-slate-900 dark:text-slate-100' : modalPublishedRateTone(monthlySummary.compound)}`}>{privateReportedRate(monthlySummary.compound)}</p></div>
											</div>
											<input aria-label='YTD publicado por el fondo' className='portfolio-input' type='number' step='0.01' name='publishedYtdReturn' value={form.publishedYtdReturn ?? ''} onChange={onChange} placeholder='Total YTD publicado por el fondo %' />
										</div>
													</div>
												)}
														<div className='rounded-xl border border-slate-200 p-3 space-y-2 dark:border-slate-700'>
															<p className='text-sm font-bold text-violet-700 dark:text-purple-300'>Datos para recibir transferencias</p>
													<input className='portfolio-input' name='accountHolder' value={form.accountHolder || ''} onChange={onChange} placeholder='Titular de la cuenta' />
													<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' name='accountNumber' value={form.accountNumber || ''} onChange={onChange} placeholder='Número de cuenta' /><input className='portfolio-input' name='accountType' value={form.accountType || ''} onChange={onChange} placeholder='Tipo de cuenta' /></div>
													<input className='portfolio-input' name='cbu' value={form.cbu || ''} onChange={onChange} placeholder='CBU / cuenta destino' />
													<input className='portfolio-input' name='alias' value={form.alias || ''} onChange={onChange} placeholder='Alias' />
													<div className='grid grid-cols-2 gap-2'><input className='portfolio-input' name='routingNumber' value={form.routingNumber || ''} onChange={onChange} placeholder='Routing number' /><input className='portfolio-input' name='swift' value={form.swift || ''} onChange={onChange} placeholder='SWIFT' /></div>
													<input className='portfolio-input' name='bankName' value={form.bankName || ''} onChange={onChange} placeholder='Banco receptor' />
													<textarea className='portfolio-input' name='bankAddress' value={form.bankAddress || ''} onChange={onChange} placeholder='Dirección del banco' rows='2' />
													<textarea className='portfolio-input' name='depositInstructions' value={form.depositInstructions || ''} onChange={onChange} placeholder='Instrucciones / datos adicionales para transferir' rows='2' />
												</div>
												<input className='portfolio-input' name='appUrl' value={form.appUrl || ''} onChange={onChange} placeholder='Acceso app / deep link (opcional)' />
												<input className='portfolio-input' name='webUrl' value={form.webUrl || ''} onChange={onChange} placeholder='Web fallback oficial (opcional)' />
												<input className='portfolio-input' type='url' name='infoUrl' value={form.infoUrl || ''} onChange={onChange} placeholder='Página oficial de información / rendimiento' />
														<div className='rounded-lg border border-slate-200 p-3 space-y-2 dark:border-slate-700'>
															<p className='text-xs font-semibold text-violet-700 dark:text-purple-300'>Fuente y verificación</p>
													<input className='portfolio-input' type='url' name='sourceUrl' value={form.sourceUrl || ''} onChange={onChange} placeholder='Fuente oficial usada para verificar' />
															<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'><label className='text-xs text-slate-600 dark:text-slate-300'>Fuente consultada<input className='portfolio-input mt-1' type='date' name='sourceCheckedAt' value={form.sourceCheckedAt || ''} onChange={onChange} /></label><label className='text-xs text-slate-600 dark:text-slate-300'>Tasa verificada<input className='portfolio-input mt-1' type='date' name='rateVerifiedAt' value={form.rateVerifiedAt || ''} onChange={onChange} /></label></div>
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
																{form.category === 'Plazo fijo' && <section aria-label='Información del plazo fijo' className='space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70'>
																	<p className='text-sm font-semibold text-violet-700 dark:text-violet-200'>Información del plazo fijo</p>
																	<p className='text-xs text-slate-700 dark:text-slate-300'>Intereses del contrato según el banco. Son informativos hasta su acreditación; no se suman al saldo ni a ganancias realizadas.</p>
																	<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
																		<label className='text-xs text-slate-700 dark:text-slate-200'>Intereses devengados (sin acreditar)<input className='portfolio-input mt-1' type='number' min='0' step='0.01' name='depositAccruedInterest' value={form.depositAccruedInterest ?? ''} onChange={onChange}/></label>
																		<label className='text-xs text-slate-700 dark:text-slate-200'>Intereses totales previstos<input className='portfolio-input mt-1' type='number' min='0' step='0.01' name='depositTotalInterest' value={form.depositTotalInterest ?? ''} onChange={onChange}/></label>
																	</div>
																	<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
																		<label className='text-xs text-slate-700 dark:text-slate-200'>Número de contrato<input className='portfolio-input mt-1' name='depositContractNumber' value={form.depositContractNumber || ''} onChange={onChange}/></label>
																		<label className='text-xs text-slate-700 dark:text-slate-200'>Renovación automática<select className='portfolio-input mt-1' name='depositAutoRenewal' value={form.depositAutoRenewal || ''} onChange={onChange}><option value=''>Sin informar</option><option value='SI'>Sí</option><option value='NO'>No</option></select></label>
																	</div>
																</section>}
												<textarea className='portfolio-input' name='notes' value={form.notes} onChange={onChange} placeholder='Notas' rows='2' />
											</div>
										<div data-testid='portfolio-form-actions' className='sticky bottom-0 z-10 -mx-2 mt-4 space-y-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95'>
										<button
												type='submit'
												disabled={pendingAction === 'save'}
												aria-busy={pendingAction === 'save'}
												className='inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60'
											>
												{pendingAction === 'save' && (
													<span className='w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin' aria-hidden='true' />
												)}
												{pendingAction === 'save'
													? editingId
														? 'Guardando cambios…'
														: 'Agregando…'
													: editingId
														? 'Guardar cambios'
														: 'Agregar al portfolio'}
											</button>
											{editingId && <button className='min-h-[44px] w-full rounded-lg py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-200' type='button' onClick={reset}>Cancelar edición</button>}
										</div>
										</form>
	);

	return (
		<main
			className='relative min-h-screen max-w-full bg-slate-50 dark:bg-gray-900 dark:text-zinc-100 px-3 sm:px-5 lg:px-8 py-5'
		>
			<div className='max-w-7xl mx-auto w-full'>
				<QuickAccessCard
					eyebrow='Tu patrimonio, en un solo lugar'
					title='Cuentas e inversiones'
					description='Saldos y posiciones por moneda.'
					actionsClassName='min-w-0 sm:shrink-0'
				>
					<FinancialHeaderActions
						currentSection='portfolio'
						primaryLabel='Agregar posición'
						onPrimaryAction={() => { reset(); setShowForm(true); }}
						valuesVisible={!hideValues}
						onTogglePrivacy={() => setHideValues((value) => !value)}
						visibleIcon={eyeHide}
						hiddenIcon={closeEye}
					/>
				</QuickAccessCard>
				{loading ? <PageDataSkeleton variant='portfolio' withKpiCards={false} /> : <>
				<div id='portfolio-workspace' className='grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-3'>
				<CollapsibleSection
					id='portfolio-summary'
					eyebrow='Resumen'
					title='Resumen por moneda'
					description='Saldos, rendimiento estimado y tasa ponderada por moneda.'
					collapsed={collapsedSections.summary}
					onToggle={() => togglePortfolioSection('summary')}
					className='min-w-0'
					contentClassName='grid min-w-0 gap-3'
				>
					{Object.entries(totals).map(([currency, total]) => (
						<div key={currency} className='min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70'>
							<p className='text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-200'>{currency}</p>
							<p className='mt-1 break-words text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50'>{privateMoney(total.balance, currency)}</p>
							<p className='mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400'>Estimado anual: {privateMoney(total.annual, currency)}</p>
							<p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>Estimado mensual: {privateMoney(total.annual / 12, currency)}</p>
							<p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>Tasa ponderada: {privatePercent(weightedRates[currency])}</p>
						</div>
					))}
					{!Object.keys(totals).length && <div className='text-gray-500'>Todavía no cargaste posiciones.</div>}
				</CollapsibleSection>

				<CollapsibleSection
					id='portfolio-positions'
					eyebrow='Actividad'
					title='Posiciones'
					description={`${privateCount(positions.length)} activas · cuentas e inversiones cargadas`}
					collapsed={collapsedSections.positions}
					onToggle={() => togglePortfolioSection('positions')}
					className='min-w-0 lg:col-span-2 lg:row-span-2'
					contentClassName='space-y-3'
				>
						<ScreenshotImportShortcut
							title='Importar captura de inversión'
							description='Elegí qué posición actualizar o creá una nueva. La captura se lee en tu dispositivo y los cambios requieren confirmación.'
							actionLabel='Importar captura'
							onAction={openScreenshotImport}
							disabled={!screenshotTargetId || (screenshotTargetId !== '__new__' && !positions.some((position) => position.id === screenshotTargetId))}
							hint='Podés comparar los datos detectados antes de modificar el Portfolio.'
						>
							<label className='block text-sm font-semibold text-slate-900 dark:text-slate-50'>Posición de destino
								<select aria-label='Posición para importar captura' value={screenshotTargetId} onChange={(event) => setScreenshotTargetId(event.target.value)}
									className='mt-1 min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50'>
									<option value=''>Elegí una posición</option>
									<option value='__new__'>Nueva posición</option>
									{positions.map((position) => <option key={position.id} value={position.id}>{position.institution} · {position.name}</option>)}
								</select>
							</label>
						</ScreenshotImportShortcut>
						{loading && <p className='text-gray-500'>Cargando portfolio...</p>}
						{!loading && !positions.length && (
							<div className='border border-dashed dark:border-slate-700 rounded-2xl p-8 text-center'>
								<div className='w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center'><FaWallet /></div>
								<h3 className='font-semibold'>Tu portfolio está vacío</h3>
								<p className='text-sm text-gray-500 mt-1'>Agregá tu primera cuenta o inversión con «Agregar posición».</p>
								<button type='button' onClick={() => setShowForm(true)} className='mt-4 min-h-[44px] rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500'>Agregar posición</button>
							</div>
						)}
						{!loading && positions.length > 0 && (
							<Reorder.Group
								as='div'
								axis='y'
								values={positions}
								onReorder={handleReorderPositions}
								className='min-w-0 space-y-3'
							>
								{positions.map((position) => (
									<SortablePortfolioPositionCard
										key={position.id}
										position={position}
										onDragEnd={persistPositionOrder}
										onKeyboardMove={movePositionWithKeyboard}
									>
								<div className='grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] sm:items-start'>
									<div>
										<p className='text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-200'>{position.institution}</p>
										<div className='flex items-start gap-2 mt-1'>
											<Link to={`/portfolio/${position.id}`} className='group flex items-center gap-2 min-w-0 rounded-lg -ml-2 px-2 py-1 hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500' aria-label={`Abrir ficha de ${position.name}`}>
												<span className='min-w-0'><span className='block break-words text-lg font-bold leading-snug text-slate-900 group-hover:text-violet-700 dark:text-slate-50 dark:group-hover:text-violet-200 sm:text-xl'>{position.name}</span><span className='block mt-1 text-xs font-semibold text-violet-700 dark:text-violet-200'>Abrir ficha <span aria-hidden='true'>›</span></span></span>
											</Link>
											{position.notes && <InfoTooltip placement='top' content={position.notes} />}
										</div>
										<p className='mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300'>{position.category}</p>
										<p className='mt-3 break-words text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50 sm:text-3xl'>{privateMoney(position.balance, position.currency)}</p>
									</div>
									<div className='min-w-0 text-left sm:min-w-[14rem] sm:text-right'>
										{isCashWithoutYield(position) ? (
											<>
												<p className='text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300'>Disponibilidad</p>
												<p className='mt-1 break-words text-base font-semibold text-slate-900 dark:text-slate-50'>Efectivo sin rendimiento</p>
												<p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>{position.liquidity || 'Disponibilidad no informada'}</p>
											</>
										) : (
											<>
										<p className='text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300'>{position.category === 'FCI' || position.trackingMode === 'NAV' ? 'YTD publicado por el fondo' : 'Tasa anual informada'}</p>
										<p className={`break-words text-xl font-bold tabular-nums sm:text-2xl ${reportedRateTone(position.category === 'FCI' || position.trackingMode === 'NAV' ? position.publishedYtdReturn : position.annualRate)}`}>
											{privateReportedRate(position.category === 'FCI' || position.trackingMode === 'NAV' ? position.publishedYtdReturn : position.annualRate)}
											{position.category !== 'FCI' && position.trackingMode !== 'NAV' && <span className='text-sm text-slate-600 dark:text-slate-300'> {position.rateType || ''}</span>}
										</p>
										<p className='text-sm text-slate-600 dark:text-slate-300'>{position.liquidity || 'Liquidez no informada'}</p>
										{position.category === 'FCI' || position.trackingMode === 'NAV' ? (
											<p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>Valuación NAV · no es ganancia realizada</p>
										) : parsePublishedReturn(position.annualRate) !== null ? (
											<p className='mt-1 break-words text-sm text-slate-600 dark:text-slate-300'>≈ {privateMoney(Number(position.balance || 0) * Number(position.annualRate) / 100 / 12, position.currency)} / mes estimado</p>
										) : (
											<p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>Sin proyección: tasa no informada</p>
										)}
											</>
										)}
										<button type='button' aria-expanded={Boolean(expandedPositionIds[position.id])}
											aria-controls={'portfolio-position-details-' + position.id}
											aria-label={(expandedPositionIds[position.id] ? 'Ocultar detalles de ' : 'Ver detalles de ') + position.name}
											onClick={() => setExpandedPositionIds((prev) => ({ ...prev, [position.id]: !prev[position.id] }))}
											className={FINANCIAL_RECORD_DISCLOSURE_STYLES + ' mt-2'}>
											<FaChevronDown aria-hidden='true' className={'h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ' + (expandedPositionIds[position.id] ? 'rotate-180' : '')}/>
											{expandedPositionIds[position.id] ? 'Ocultar detalles' : 'Ver detalles'}
										</button>
										{Boolean(expandedPositionIds[position.id]) && (
											<section id={'portfolio-position-details-' + position.id} aria-label={'Detalles de ' + position.name}
												className='mt-2 min-w-0 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm dark:border-slate-700 dark:bg-slate-900/70'>
										{position.trackingMode === 'DAILY_RATE' && parsePublishedReturn(position.annualRate) !== null && <p className='text-xs text-slate-600 dark:text-slate-300'>Esperado hoy: {privateMoney(Number(position.balance || 0) * Number(position.annualRate) / 100 / 365, position.currency)}</p>}
										{position.trackingMode === 'MATURITY' && position.maturityDate && <p className='text-xs text-slate-600 dark:text-slate-300'>Seguimiento al vencimiento: {position.maturityDate}</p>}
										{position.category === 'Plazo fijo' && position.depositAccruedInterest != null && <p className='text-xs text-slate-700 dark:text-slate-300'>Intereses devengados (sin acreditar): {privateMoney(position.depositAccruedInterest, position.currency)}</p>}
										{position.category === 'Plazo fijo' && position.depositTotalInterest != null && <p className='text-xs text-slate-700 dark:text-slate-300'>Intereses totales previstos: {privateMoney(position.depositTotalInterest, position.currency)}</p>}
										{position.category === 'Plazo fijo' && position.depositAutoRenewal && <p className='text-xs text-slate-700 dark:text-slate-300'>Renovación automática: {position.depositAutoRenewal === 'SI' ? 'Sí' : 'No'}</p>}
										{position.category === 'Plazo fijo' && position.depositContractNumber && <p className='text-xs text-slate-700 dark:text-slate-300'>N.º de contrato: {hideValues ? '••••••' : position.depositContractNumber}</p>}
										<p className='text-xs text-slate-600 dark:text-slate-300'>Tracking: {position.trackingMode || 'MANUAL'}</p>
										{position.category === 'FCI' && position.ticker && <p className='text-xs text-slate-600 dark:text-slate-300'>Ticker: {position.ticker}</p>}
										{position.category === 'FCI' && Number(position.nav || 0) > 0 && <p className='text-xs text-slate-600 dark:text-slate-300'>NAV: {hideValues ? '••••••' : Number(position.nav).toFixed(5)} {position.navDate ? `· ${position.navDate}` : ''}</p>}
										{position.category === 'FCI' && parsePublishedReturn(position.performance1Y) !== null && <p className={`text-xs font-semibold ${reportedRateTone(position.performance1Y)}`}>Rend. 1A publicado: {privateReportedRate(position.performance1Y)}</p>}
										{position.category === 'FCI' && summarizePublishedReturns(position.monthlyReturns).entries.length > 0 && <p className={`text-sm font-bold ${reportedRateTone(summarizePublishedReturns(position.monthlyReturns).compound)}`}>Compuesto (meses cargados): {privateReportedRate(summarizePublishedReturns(position.monthlyReturns).compound)}</p>}
										{accountActivityByPosition[position.id] ? (
											<div className='mt-2 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800'>
												<p className='font-semibold text-slate-900 dark:text-slate-50'>Rendimientos clasificados: <span className='text-emerald-700 dark:text-emerald-400'>{privateMoney(accountActivityByPosition[position.id].userTaggedEarnings,position.currency)}</span></p>
												{accountActivityByPosition[position.id].withdrawals > 0 && <p className='text-slate-700 dark:text-slate-200'>Retiros de capital: {privateMoney(accountActivityByPosition[position.id].withdrawals,position.currency)} <span className='text-xs text-slate-600 dark:text-slate-300'>· no son pérdidas</span></p>}
												{accountActivityByPosition[position.id].deposits > 0 && <p className='text-slate-700 dark:text-slate-200'>Aportes de capital: {privateMoney(accountActivityByPosition[position.id].deposits,position.currency)}</p>}
												{accountActivityByPosition[position.id].needsReview && <p className='font-semibold text-amber-700 dark:text-amber-300'>Historial de ganancias pendiente de conciliación{accountActivityByPosition[position.id].negativeLegacyEarnings ? ` · ${privateMoney(position.realizedEarnings,position.currency)} cargados` : ''}</p>}
											</div>
										) : (
											<>
												{Number(position.realizedEarnings || 0) !== 0 && <p className={`mt-1 text-sm font-semibold ${Number(position.realizedEarnings) < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-500'}`}>{Number(position.realizedEarnings) < 0 ? 'Ganancias cargadas · revisar:' : 'Ganancias cargadas (sin conciliar):'} {privateMoney(position.realizedEarnings, position.currency)}</p>}
												{Number(position.effectiveRate || 0) > 0 && <p className='text-xs text-slate-600 dark:text-slate-300'>Tasa efectiva: {privatePercent(position.effectiveRate)}</p>}
												{performanceByPosition[position.id] && (
													<div className='mt-2 text-sm'>
														<p className={performanceByPosition[position.id].change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}>
															{position.category === 'FCI' || position.trackingMode === 'NAV' ? 'Variación de valuación' : 'Variación del saldo (incluye transferencias)'}: {privateMoney(performanceByPosition[position.id].change, position.currency)}
														</p>
														<p className='text-xs text-slate-600 dark:text-slate-300'>{privateCount(performanceByPosition[position.id].count)} snapshots</p>
													</div>
												)}
											</>
										)}
											</section>
										)}
									</div>
								</div>
								<div className='flex flex-col gap-3 mt-4'>
									<button className='min-h-[44px] w-full rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-700 dark:bg-slate-900/70 dark:text-violet-200 dark:hover:bg-slate-900 sm:w-auto' onClick={() => requestVerify(position)}>{position.category === 'FCI' || position.trackingMode === 'NAV' ? 'Actualizar cuotaparte' : 'Verificar saldo'}</button>
									<div className='flex w-full flex-wrap items-center gap-2'>
										{position.infoUrl && <button title='Información oficial del activo' aria-label='Información oficial del activo' className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 hover:text-blue-400' onClick={() => openInfo(position)}><FaBookOpen /></button>}
										{(position.category === 'Cuenta remunerada' || /earn\s*vault/i.test(`${position.name || ''} ${position.category || ''}`)) && <button title='Actualizar tasa rápidamente' aria-label='Actualizar tasa rápidamente' className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 hover:text-green-400' onClick={() => requestRateUpdate(position)}><FaPercent /></button>}
										{(position.appUrl || position.webUrl) && <button title='Abrir app / web' aria-label='Abrir app o web' className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100' onClick={() => openInstitution(position)}><FaExternalLinkAlt /></button>}
										<button title='Editar posición' aria-label='Editar posición' className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 hover:text-purple-500' onClick={() => edit(position)}><FaPencilAlt /></button>
										<button title='Eliminar posición' aria-label='Eliminar posición' className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-300 bg-white text-red-600 dark:bg-slate-800 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30' onClick={() => requestDelete(position)}><FaTrashAlt /></button>
									</div>
								</div>
									</SortablePortfolioPositionCard>
								))}
							</Reorder.Group>
						)}
				</CollapsibleSection>
				<CollapsibleSection
					id='portfolio-charts'
					eyebrow='Visualización'
					title='Gráficos'
					description='Distribución, evolución y simulaciones de tus posiciones.'
					collapsed={collapsedSections.charts}
					onToggle={() => togglePortfolioSection('charts')}
					className='min-w-0'
				>
					<PortfolioCharts positions={positions} snapshots={snapshots} hideValues={hideValues} />
				</CollapsibleSection>

				</div>
				</>}
				<div className='mt-5' data-testid='portfolio-tools-spacing'>
				<FinancialOverviewPanel
						isLoading={loading}
						id='portfolio-overview'
						collapsed={collapsedSections.overview}
						onToggle={() => togglePortfolioSection('overview')}
						eyebrow='Herramientas'
						title='Métricas y exportaciones'
						privacyHidden={hideValues}
						actions={[
							{ id: 'excel', type: 'excel', label: 'Exportar archivos', onClick: openPortfolioExport, disabled: loading || !positions.length },
							{ id: 'markdown', type: 'markdown', label: 'Copiar para Lita', onClick: copyLlmPrompt, disabled: !positions.length },
						]}
						metrics={[
							{ id: 'positions', icon: FaWallet, label: 'Posiciones', value: privateCount(portfolioMeta.positions) },
							{ id: 'currencies', icon: FaChartLine, label: 'Monedas', value: privateCount(portfolioMeta.currencies) },
							{ id: 'earnings', icon: FaRegClock, label: 'Con ganancias', value: privateCount(positions.filter((item) => Number(item.realizedEarnings || 0) > 0).length) },
						]}
					/>
				</div>

			</div>

			<GenericModal
				show={showForm}
				component={portfolioFormContent}
				closeModal={reset}
			/>

			<GenericModal
				show={Boolean(verifyTarget)}
				dialogLabel={isNavVerification ? 'Actualizar cuotaparte' : 'Confirmar saldo'}
				component={(
					<div className={portfolioDialog.content}>
						<h2 className='text-xl font-bold'>{isNavVerification ? 'Actualizar cuotaparte' : 'Confirmar saldo'}</h2>
						<p className={portfolioDialog.description}>
							{isNavVerification
								? <>Ingresá el <strong>valor de la cuotaparte</strong> actual de <strong>{verifyTarget?.name}</strong>. LTC guardará una valuación NAV, no un rendimiento realizado.</>
								: <>Ingresá el saldo actual de <strong>{verifyTarget?.name}</strong>. Al confirmar también se guardará un snapshot para el histórico.</>}
						</p>

						{isNavVerification ? (
							<div className='mt-4 space-y-3'>
								<div className='rounded-xl border border-purple-500/30 bg-purple-500/10 p-3'>
									<div className='grid grid-cols-2 gap-3 text-sm'>
										<div className='min-w-0'><p className={portfolioDialog.muted}>Cuotapartes</p><p className='break-words font-bold tabular-nums'>{verifyShares > 0 ? verifyShares.toLocaleString('es-AR', { maximumFractionDigits: 6 }) : 'No cargadas'}</p></div>
										<div className='min-w-0'><p className={portfolioDialog.muted}>NAV anterior</p><p className='break-words font-bold tabular-nums'>{currentNav > 0 ? currentNav.toLocaleString('es-AR', { maximumFractionDigits: 6 }) : 'Sin dato'}</p></div>
									</div>
								</div>
								<label className={portfolioDialog.label}>
									Valor cuotaparte / NAV actual
									<input autoFocus className={portfolioDialog.field + ' mt-1'} type='number' step='0.000001' min='0' value={verifyNav} onChange={(event) => setVerifyNav(event.target.value)} placeholder='Ej. 1.168245' />
								</label>
								{verifyShares > 0 ? (
									<div className='min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70'>
										<p className={portfolioDialog.muted}>Valuación calculada · cuotapartes × NAV</p>
										<p className='mt-1 break-words text-xl font-bold tabular-nums'>{calculatedNavBalance == null ? '—' : money(calculatedNavBalance, verifyTarget?.currency)}</p>
										{navVariationPercent != null && <p className={`mt-1 text-sm font-semibold ${navVariationPercent >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>Variación NAV: {navVariationPercent >= 0 ? '+' : ''}{navVariationPercent.toFixed(3)}%</p>}
									</div>
								) : (
									<div>
										<label htmlFor='portfolio-verify-valuation' className={portfolioDialog.label}>Valuación total</label>
										<input id='portfolio-verify-valuation' aria-describedby='portfolio-verify-valuation-help' className={portfolioDialog.field + ' mt-1'} type='number' step='0.01' min='0' value={verifyBalance} onChange={(event) => setVerifyBalance(event.target.value)} placeholder='Saldo / valuación actual' />
										<p id='portfolio-verify-valuation-help' className='mt-1 text-xs text-amber-800 dark:text-amber-300'>Cargá las cuotapartes en la posición para que LTC calcule automáticamente la valuación desde el NAV.</p>
									</div>
								)}
								<div>
									<label htmlFor='portfolio-verify-earnings' className={portfolioDialog.label}>Ganado informado acumulado</label>
									<input
										id='portfolio-verify-earnings'
										aria-describedby='portfolio-verify-earnings-help'
										className={portfolioDialog.field + ' mt-1'}
										type='number'
										step='0.01'
										value={verifyReportedEarnings}
										onChange={(event) => setVerifyReportedEarnings(event.target.value)}
										placeholder='Ej. 70.00'
									/>
									<p id='portfolio-verify-earnings-help' className={'mt-1 ' + portfolioDialog.muted}>
										Este valor actualiza “Ganado” de la posición. Es independiente de la variación del NAV y no crea una transacción.
									</p>
								</div>
								<div className='rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100'>La suba o baja de la cuotaparte se registra como <strong>variación de valuación</strong>. El campo “Ganado informado” se guarda por separado.</div>
							</div>
						) : (
							<>
								<label className={portfolioDialog.label + ' mt-4'}>Saldo actual
									<input autoFocus className={portfolioDialog.field + ' mt-1'} type='number' step='0.01' min='0' value={verifyBalance} onChange={(event) => setVerifyBalance(event.target.value)} placeholder='Saldo actual' />
								</label>
								<label className={portfolioDialog.label + ' mt-3'}>¿Qué explica el cambio de saldo?<select className={portfolioDialog.field + ' mt-1'} value={verifyChangeType} onChange={(event) => setVerifyChangeType(event.target.value)}><option value='unclassified'>Sin clasificar (no se suma a ganancias)</option><option value='earning'>Rendimiento acreditado</option><option value='deposit'>Aporte</option><option value='withdrawal'>Retiro</option><option value='adjustment'>Ajuste</option></select></label>
							</>
						)}

						<label className={portfolioDialog.label + ' mt-3'}>Nota opcional
							<textarea className={portfolioDialog.field + ' mt-1'} rows='2' value={verifyNote} onChange={(event) => setVerifyNote(event.target.value)} placeholder={isNavVerification ? 'Nota opcional sobre esta valuación' : 'Nota opcional sobre esta verificación'} />
						</label>
						{!isNavVerification && <p className={'mt-2 ' + portfolioDialog.muted}>El saldo puede cambiar por transferencias sin que cambie la tasa. Elegí el motivo real: sin clasificar no suma ganancias. Si hubo aportes y rendimiento juntos, no atribuyas toda la diferencia a intereses.</p>}
						<div className='grid grid-cols-2 gap-2 mt-5'>
							<button type='button' disabled={pendingAction === 'verify'} onClick={() => { setVerifyTarget(null); setVerifyReportedEarnings(''); }} className={portfolioDialog.cancel}>Cancelar</button>
							<button type='button' disabled={(isNavVerification ? (verifyNav === '' || (verifyShares <= 0 && verifyBalance === '')) : verifyBalance === '') || pendingAction === 'verify'} onClick={verify} className={portfolioDialog.save}>{pendingAction === 'verify' && <span className='w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin' />}{pendingAction === 'verify' ? (isNavVerification ? 'Actualizando…' : 'Verificando…') : (isNavVerification ? 'Guardar cuotaparte' : 'Confirmar saldo')}</button>
						</div>
					</div>
				)}
				closeModal={() => { if (pendingAction === 'verify') return; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setVerifyTarget(null); setVerifyReportedEarnings(''); }}
			/>

			<GenericModal
				show={Boolean(rateTarget)}
				dialogLabel='Actualizar tasa'
				component={() => (
					<div className={portfolioDialog.content}>
						<div aria-hidden='true' className='mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'><FaPercent /></div>
						<h2 className='text-xl font-bold'>Actualizar tasa</h2>
						<p className={portfolioDialog.description}><strong>{rateTarget?.institution}</strong> · {rateTarget?.name}</p>
						<p className={'mt-1 ' + portfolioDialog.muted}>Actualizá solamente la tasa. El resto de la posición no cambia.</p>
						<label htmlFor='portfolio-quick-rate' className={portfolioDialog.label + ' mt-4'}>Tasa anual (%)</label>
						<div className='relative mt-1'>
							<input id='portfolio-quick-rate' autoFocus className={portfolioDialog.field + ' pr-10 font-bold tabular-nums'} type='number' step='0.01' min='0' value={quickRate} onChange={(event) => setQuickRate(event.target.value)} placeholder='Ej. 2,5' />
							<span aria-hidden='true' className='pointer-events-none absolute right-3 top-3 font-bold text-slate-600 dark:text-slate-300'>%</span>
						</div>
						<div className='mt-5 grid grid-cols-2 gap-2'>
							<button type='button' disabled={pendingAction === 'rate'} onClick={() => setRateTarget(null)} className={portfolioDialog.cancel}>Cancelar</button>
							<button type='button' disabled={quickRate === '' || pendingAction === 'rate'} onClick={saveQuickRate} className={portfolioDialog.save}>{pendingAction === 'rate' && <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white' />}{pendingAction === 'rate' ? 'Guardando…' : 'Guardar tasa'}</button>
						</div>
					</div>
				)}
				closeModal={() => { if (pendingAction !== 'rate') setRateTarget(null); }}
			/>

			<GenericModal
				show={Boolean(deleteTarget)}
				dialogLabel='Eliminar posición'
				component={() => (
					<div className={portfolioDialog.content}>
						<div aria-hidden='true' className='mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'><FaTrashAlt /></div>
						<h2 className='text-xl font-bold'>Eliminar posición</h2>
						<p className={portfolioDialog.description}>¿Seguro que querés eliminar <strong>{deleteTarget?.name}</strong> de {deleteTarget?.institution}? Esta acción no se puede deshacer.</p>
						<div className='grid grid-cols-2 gap-2 mt-5'>
							<button type='button' disabled={pendingAction === 'delete'} onClick={() => setDeleteTarget(null)} className={portfolioDialog.cancelDestructive}>Cancelar</button>
							<button type='button' disabled={pendingAction === 'delete'} onClick={remove} className={portfolioDialog.danger}>{pendingAction === 'delete' && <span className='w-4 h-4 rounded-full border-2 border-rose-500/40 border-t-rose-600 animate-spin' />}{pendingAction === 'delete' ? 'Eliminando…' : 'Eliminar'}</button>
						</div>
					</div>
				)}
				closeModal={() => { if (pendingAction !== 'delete') setDeleteTarget(null); }}
			/>

			{!loading && (
				<FloatingMenu
					openTransactionModal={() => setShowForm(true)}
					openLitaModal={() => setShowLita(true)}
					primaryMessage='Posición'
					isModalOpen={
						showForm ||
						showLita ||
						Boolean(verifyTarget) ||
						Boolean(rateTarget) ||
						Boolean(deleteTarget)
					}
				/>
			)}

			<PortfolioExportReady prepared={preparedPortfolioExport} onClose={clearPreparedPortfolioExport} />

			{showLita && (
				<LitaAssistantPanel
					isOpen={showLita}
					setIsOpen={setShowLita}
					section='portfolio'
					context={litaPortfolioContext}
					privacyHidden={hideValues}
				/>
			)}

		</main>
	);
}

export default Portfolio;
