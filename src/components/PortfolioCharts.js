import React, { useMemo } from 'react';
import { AreaChart, BarList, Card, Flex, Text, Title, Bold } from '@tremor/react';

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

const PortfolioCharts = ({ positions, snapshots }) => {
	const currencies = useMemo(
		() => [...new Set(positions.map((item) => item.currency || 'ARS'))],
		[positions]
	);
	const [currency, setCurrency] = React.useState(currencies[0] || 'USD');
	const [view, setView] = React.useState('history');
	const [selectedPositionId, setSelectedPositionId] = React.useState('');

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

	const positionIds = useMemo(
		() => new Set(positions.filter((p) => (p.currency || 'ARS') === currency).map((p) => p.id)),
		[positions, currency]
	);

	const history = useMemo(() => {
		const byDate = {};
		snapshots.forEach((item) => {
			if (!positionIds.has(item.positionId)) return;
			const date = snapshotDate(item.capturedAt);
			if (!date) return;
			const key = date.toISOString().slice(0, 10);
			byDate[key] = (byDate[key] || 0) + Number(item.balance || 0);
		});
		return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, balance]) => ({
			date: new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(new Date(date + 'T12:00:00')),
			Saldo: balance,
		}));
	}, [snapshots, positionIds]);

	const allocation = useMemo(
		() => positions
			.filter((item) => (item.currency || 'ARS') === currency)
			.map((item) => ({ name: item.name || item.institution || 'Posición', value: Number(item.balance || 0) }))
			.sort((a, b) => b.value - a.value),
		[positions, currency]
	);

	if (!positions.length) return null;

	return (
		<section className='mb-7 space-y-6'>
			<div className='flex flex-wrap items-center justify-between gap-3 mb-3'>
				<div><h2 className='text-lg font-bold'>Evolución del portfolio</h2><p className='text-xs text-gray-500'>Cada moneda se analiza por separado.</p></div>
				<div className='flex gap-2'>
					{currencies.map((item) => <button key={item} type='button' onClick={() => setCurrency(item)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border dark:border-slate-600 ${currency === item ? 'bg-ltc-green text-white border-ltc-green' : 'bg-white dark:bg-slate-800'}`}>{item}</button>)}
				</div>
			</div>
			<Card className='dark:bg-slate-800 dark:border-slate-700 overflow-hidden'>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
					<Title className='min-w-0 break-words'>{view === 'history' ? 'Histórico de saldo' : 'Distribución por posición'} · {currency}</Title>
					<div className='grid grid-cols-2 w-full sm:w-auto shrink-0 rounded-lg border dark:border-slate-600 overflow-hidden'>
						<button type='button' onClick={() => setView('history')} className={`min-w-0 px-2 sm:px-3 py-2 text-xs ${view === 'history' ? 'bg-ltc-green text-white' : 'dark:text-white'}`}>Histórico</button>
						<button type='button' onClick={() => setView('allocation')} className={`min-w-0 px-2 sm:px-3 py-2 text-xs ${view === 'allocation' ? 'bg-ltc-green text-white' : 'dark:text-white'}`}>Distribución</button>
					</div>
				</div>
				{view === 'history' && history.length >= 2 && <AreaChart className='mt-4 h-48 sm:h-56' data={history} index='date' categories={['Saldo']} colors={['indigo']} valueFormatter={(value) => formatMoney(value, currency)} showLegend={false} yAxisWidth={50} />}
				{view === 'history' && history.length < 2 && <div className='py-10 text-center text-sm text-gray-500'>Guardá al menos dos snapshots para ver la evolución histórica.</div>}
				{view === 'allocation' && <><Flex className='mt-2'><Text><Bold>Posición</Bold></Text><Text><Bold>Saldo</Bold></Text></Flex><BarList data={allocation} className='mt-3' valueFormatter={(value) => formatMoney(value, currency)} color='indigo' /></>}
			</Card>

			<Card className='dark:bg-slate-800 dark:border-slate-700 overflow-hidden'>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
					<div><Title>Rendimiento por activo</Title><Text>Histórico real y simulación con la tasa cargada.</Text></div>
					<select className='portfolio-input sm:max-w-xs' value={selectedPositionId} onChange={(event) => setSelectedPositionId(event.target.value)}>
						{currencyPositions.map((item) => <option key={item.id} value={item.id}>{item.institution} · {item.name}</option>)}
					</select>
				</div>
				{selectedPosition && <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-sm'><div><Text>Saldo</Text><Bold>{formatMoney(selectedPosition.balance, currency)}</Bold></div><div><Text>Tasa cargada</Text><Bold>{Number(selectedPosition.annualRate || 0).toFixed(2)}% {selectedPosition.rateType || ''}</Bold></div><div><Text>Ganado informado</Text><Bold>{formatMoney(selectedPosition.realizedEarnings, currency)}</Bold></div><div><Text>Último cambio</Text><Bold>{formatMoney(selectedPosition.lastEarning, currency)}</Bold></div></div>}
				<div className='mt-6'><Text><Bold>Evolución real del saldo</Bold></Text>{assetHistory.length >= 2 ? <AreaChart className='mt-2 h-48' data={assetHistory} index='date' categories={['Saldo']} colors={['indigo']} valueFormatter={(value) => formatMoney(value, currency)} showLegend={false} yAxisWidth={50} /> : <div className='py-6 text-center text-sm text-gray-500'>Confirmá el saldo en distintas fechas para construir este histórico.</div>}</div>
				<div className='mt-6'><Text><Bold>Simulación de crecimiento</Bold></Text><Text>Proyección matemática manteniendo constante la tasa actual; no es rendimiento garantizado.</Text>{simulation.length > 0 && <AreaChart className='mt-2 h-48' data={simulation} index='period' categories={['Proyectado']} colors={['indigo']} valueFormatter={(value) => formatMoney(value, currency)} showLegend={false} yAxisWidth={50} />}</div>
			</Card>
		</section>
	);
};

export default PortfolioCharts;
