import React, { useMemo } from 'react';
import { AreaChart } from '@tremor/react';
import CollapsibleSection from './CollapsibleSection';

const compactAxisValue = (value) =>
  new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(value || 0));

const formatMoney = (value, currency) =>
	new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency,
		maximumFractionDigits: currency === 'ARS' ? 0 : 2,
	}).format(Number(value || 0));

const snapshotDate = (value) => {
	if (!value) return null;
	if (typeof value.toDate === 'function') return value.toDate();
	if (value.seconds) return new Date(value.seconds * 1000);
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const PortfolioCharts = ({ positions, snapshots, hideValues = false }) => {
	const currencies = useMemo(
		() => [...new Set(positions.map((item) => item.currency || 'ARS'))],
		[positions]
	);
	const [currency, setCurrency] = React.useState(currencies[0] || 'USD');
	const [allocationOpen, setAllocationOpen] = React.useState(true);
	const [performanceOpen, setPerformanceOpen] = React.useState(true);
	const [selectedPositionId, setSelectedPositionId] = React.useState('');
	const privateMoney = (value, targetCurrency = currency) => hideValues ? '••••••' : formatMoney(value, targetCurrency);
	const privatePercent = (value) => hideValues ? '••••' : `${Number(value || 0).toFixed(2)}%`;

	React.useEffect(() => {
		if (currencies.length && !currencies.includes(currency)) setCurrency(currencies[0]);
	}, [currencies, currency]);

	const currencyPositions = useMemo(() => positions.filter((p) => (p.currency || 'ARS') === currency), [positions, currency]);

	React.useEffect(() => {
		if (!currencyPositions.length) return setSelectedPositionId('');
		if (!currencyPositions.some((p) => p.id === selectedPositionId)) setSelectedPositionId(currencyPositions[0].id);
	}, [currencyPositions, selectedPositionId]);

	const selectedPosition = currencyPositions.find((p) => p.id === selectedPositionId);

	const assetHistory = useMemo(() => snapshots.filter((item) => item.positionId === selectedPositionId).map((item) => {
		const date = snapshotDate(item.capturedAt);
		return date ? { date: new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(date), Saldo: Number(item.balance || 0) } : null;
	}).filter(Boolean), [snapshots, selectedPositionId]);

	const simulation = useMemo(() => {
		if (!selectedPosition) return [];
		const principal = Number(selectedPosition.balance || 0);
		const rate = Number(selectedPosition.annualRate || 0) / 100;
		return [1, 3, 6, 12].map((months) => ({ period: `${months}m`, Proyectado: principal * Math.pow(1 + rate / 12, months) }));
	}, [selectedPosition]);


	const allocation = useMemo(
		() => positions
			.filter((item) => (item.currency || 'ARS') === currency)
			.map((item) => ({ name: item.name || item.institution || 'Posición', value: Number(item.balance || 0) }))
			.sort((a, b) => b.value - a.value),
		[positions, currency]
	);

	if (!positions.length) return null;

	return (
		<section className='min-w-0 space-y-4'>
			<CollapsibleSection variant='nested' id='portfolio-chart-allocation'
				title='Distribución por posición'
				description='Participación de cada posición en la moneda seleccionada.'
				collapsed={!allocationOpen}
				onToggle={() => setAllocationOpen((open) => !open)}
				contentClassName='space-y-4'>
				<div className='flex flex-wrap gap-2' role='group' aria-label='Moneda de distribución'>
					{currencies.map((item) => <button key={item} type='button' onClick={() => setCurrency(item)} aria-pressed={currency === item} className={`min-h-[40px] rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${currency === item ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-500' : 'border-slate-300 bg-white text-slate-700 hover:border-violet-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>{item}</button>)}
				</div>
				<div className='space-y-2'>
					<div className='flex justify-between gap-3 px-1 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300'><span>Posición</span><span>Saldo</span></div>
					{allocation.map((item) => { const max = allocation[0]?.value || 1; const width = hideValues ? 0 : Math.max(6, (item.value / max) * 100); return <div key={item.name} className='relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'><div className='absolute inset-y-0 left-0 bg-violet-100 dark:bg-violet-500/20' style={{ width: `${width}%` }} /><div className='relative flex min-w-0 items-center justify-between gap-3 px-3 py-3'><span className='min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50'>{item.name}</span><span className='shrink-0 text-right text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50'>{privateMoney(item.value, currency)}</span></div></div>; })}
				</div>
			</CollapsibleSection>
			<CollapsibleSection variant='nested' id='portfolio-chart-performance'
				title='Rendimiento por activo'
				description='Evolución real y simulación con la tasa cargada.'
				collapsed={!performanceOpen}
				onToggle={() => setPerformanceOpen((open) => !open)}
				contentClassName='space-y-5'>
				<div className='min-w-0 space-y-5'><div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
					<select aria-label='Seleccionar activo para rendimiento' className='portfolio-input min-h-[44px] min-w-0 sm:max-w-xs' value={selectedPositionId} onChange={(event) => setSelectedPositionId(event.target.value)}>
						{currencyPositions.map((item) => <option key={item.id} value={item.id}>{item.institution} · {item.name}</option>)}
					</select>
				</div>
				{selectedPosition && <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'><div><p className='text-sm font-semibold text-slate-600 dark:text-slate-300'>Saldo</p><p className='text-lg font-extrabold text-slate-900 dark:text-white'>{privateMoney(selectedPosition.balance, currency)}</p></div><div><p className='text-sm font-semibold text-slate-600 dark:text-slate-300'>Tasa cargada</p><p className='text-lg font-extrabold text-green-700 dark:text-green-400'>{privatePercent(selectedPosition.annualRate)} {selectedPosition.rateType || ''}</p></div><div><p className='text-sm font-semibold text-slate-600 dark:text-slate-300'>Ganado informado</p><p className='text-lg font-extrabold text-slate-900 dark:text-white'>{privateMoney(selectedPosition.realizedEarnings, currency)}</p></div><div><p className='text-sm font-semibold text-slate-600 dark:text-slate-300'>Último cambio</p><p className='text-lg font-extrabold text-slate-900 dark:text-white'>{privateMoney(selectedPosition.lastEarning, currency)}</p></div></div>}
				<div className='min-w-0'><p className='font-extrabold text-slate-900 dark:text-white'>Evolución real del saldo</p>{assetHistory.length >= 2 ? <AreaChart className='mt-3 h-52 min-w-0' data={assetHistory} index='date' categories={['Saldo']} colors={['indigo']} valueFormatter={(value) => hideValues ? '••••' : compactAxisValue(value)} showLegend={false} yAxisWidth={72} /> : <div className='py-5 text-center text-sm font-medium text-slate-600 dark:text-slate-300'>Confirmá el saldo en distintas fechas para construir este histórico.</div>}</div>
				<div className='min-w-0 border-t border-slate-200 pt-5 dark:border-slate-700'><p className='font-extrabold text-slate-900 dark:text-white'>Simulación de crecimiento</p><p className='text-sm font-medium text-slate-600 dark:text-slate-300'>Proyección matemática manteniendo constante la tasa actual; no es rendimiento garantizado.</p>{simulation.length > 0 && <AreaChart className='mt-2 h-48' data={simulation} index='period' categories={['Proyectado']} colors={['indigo']} valueFormatter={(value) => hideValues ? '••••' : compactAxisValue(value)} showLegend={false} yAxisWidth={72} />}</div>
				</div>
			</CollapsibleSection>
		</section>
	);
};

export default PortfolioCharts;
