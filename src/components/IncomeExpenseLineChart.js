import React from 'react';
import { Card, AreaChart, Title } from '@tremor/react';
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

const IncomeExpenseLineChart = ({ chartData, categories }) => {
	const generateChartData = () => {
		// Check if data is not undefined
		if (!chartData) {
			console.log('Data is undefined. Returning an empty array.');
			return [];
		}

		// Group data by month and year
		const groupedData = chartData.reduce((result, item) => {
			const isExpenseCategory = categories.find(
				(category) => category.name === item.category
			)?.isExpense;

			const { month, year } = extractMonthAndYearFromDate(item.selectedDate);
			const monthLabel = getMonthLabel(month, year);

			// Check if it's a Compra divisas category
			const isCompraDivisasCategory =
				item.category.includes('Compra divisas') && isExpenseCategory;

			// Check if it's an Ingresos Divisas category
			const isIngresoDivisasCategory = item.category.includes(
				INGRESO_DIVISAS_CATEGORY
			);

			const existingItem = result.find(
				(entry) => entry.month === month && entry.year === year
			);

			const amount =
				isIngresoDivisasCategory && item.currencyQuantity
					? Number(item.currencyQuantity.replace(',', '.')) || 0
					: typeof item.amount === 'string'
					? Number(item.amount.replace(',', '.')) || 0
					: Number(item.amount) || 0;

			if (!isIngresoDivisasCategory) {
				if (existingItem) {
					existingItem.Ingresos +=
						isCompraDivisasCategory || isExpenseCategory ? 0 : amount;
					existingItem.Gastos +=
						isExpenseCategory && !isCompraDivisasCategory ? amount : 0; // Adjusted this line
					existingItem['Compra Divisas'] += isCompraDivisasCategory
						? amount
						: 0;
				} else {
					result.push({
						month,
						year,
						monthLabel,
						Ingresos: isCompraDivisasCategory || isExpenseCategory ? 0 : amount,
						Gastos: isExpenseCategory && !isCompraDivisasCategory ? amount : 0, // Adjusted this line
						'Compra Divisas': isCompraDivisasCategory ? amount : 0,
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
		`AR$ ${new Intl.NumberFormat('us').format(number).toString()}`;

	return (
		<Card>
			<Title>Comparativa Ingresos y gastos</Title>
			<AreaChart
				className='mt-6'
				data={chartDataOutcome}
				index='monthLabel'
				categories={['Ingresos', 'Gastos', 'Compra Divisas']}
				colors={['green', 'red', 'blue']}
				valueFormatter={valueFormatter}
				yAxisWidth={30}
				showYAxis={false}
			/>
		</Card>
	);
};

export default IncomeExpenseLineChart;
