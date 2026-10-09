import React from 'react';
import { AreaChart } from '@tremor/react';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

const extractMonthAndYearFromDate = (selectedDate) => {
	const date = new Date(`${selectedDate}T00:00:00Z`);
	return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
};

const getMonthLabel = (month, year) => {
	const monthNames = [
		'Ene',
		'Feb',
		'Mar',
		'Abr',
		'May',
		'Jun',
		'Jul',
		'Ago',
		'Sep',
		'Oct',
		'Nov',
		'Dic',
	];
	return `${monthNames[month - 1]} ${year.toString().substring(2)}`; // Adjusting for zero-based months
};

const IngresoDivisasLineChart = ({ chartData }) => {
	const generateChartData = () => {
		// Check if data is not undefined
		if (!chartData) {
			console.log('Data is undefined. Returning an empty array.');
			return [];
		}

		// Group data by month and year
		const groupedData = chartData.reduce((result, item) => {
			const isIngresoDivisasCategory = item.category.includes(
				INGRESO_DIVISAS_CATEGORY
			);

			if (isIngresoDivisasCategory) {
				const { month, year } = extractMonthAndYearFromDate(item.selectedDate);
				const monthLabel = getMonthLabel(month, year);

				const existingItem = result.find(
					(entry) => entry.month === month && entry.year === year
				);

				const amount = item.currencyQuantity
					? Number(item.currencyQuantity.replace(',', '.')) || 0
					: 0;

				if (existingItem) {
					existingItem[INGRESO_DIVISAS_CATEGORY] += amount;
				} else {
					result.push({
						month,
						year,
						monthLabel,
						[INGRESO_DIVISAS_CATEGORY]: amount,
					});
				}
			}

			return result;
		}, []);

		// Sort the array by year and month
		const sortedData = groupedData.sort((a, b) => {
			if (a.year === b.year) {
				return a.month - b.month;
			}
			return a.year - b.year;
		});

		return sortedData;
	};

	const chartDataOutcome = generateChartData();

	const valueFormatter = (number) =>
		`US$ ${new Intl.NumberFormat('us').format(number).toString()}`;

	return (
		<div className='ltc-chart-surface min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 sm:p-5'>
			<h3 className='text-base font-extrabold sm:text-lg'>Ingreso divisas</h3>
			<p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>Evolución por mes · USD · Período seleccionado</p>
			<AreaChart
				className='mt-5 h-56 sm:h-72'
				data={chartDataOutcome}
				index='monthLabel'
				categories={[INGRESO_DIVISAS_CATEGORY]}
				colors={['purple']}
				valueFormatter={valueFormatter}
				yAxisWidth={30}
				showYAxis={false}
			/>
		</div>
	);
};

export default IngresoDivisasLineChart;
