import React from 'react';
import TransactionChartSurface, { TransactionChartEmpty } from './TransactionChartSurface';
import { AreaChart } from '@tremor/react';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';
import { getTransactionCurrency } from '../utils/customCategories';

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
		const groupedData = (Array.isArray(chartData) ? chartData : []).reduce((result, item) => {
			// Never report a USD amount as pesos in the ARS comparison.
			if (typeof item?.category !== 'string' || getTransactionCurrency(item) !== 'ARS') return result;
			if (!/^20\d{2}-\d{2}-\d{2}$/.test(item.selectedDate || '')) return result;
			const isExpenseCategory = (Array.isArray(categories) ? categories : []).some(
				(category) => category?.name === item.category && category.isExpense === true
			);

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
					? Number(String(item.currencyQuantity).replace(',', '.')) || 0
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

	const valueFormatter = (number) => new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(number);

	return (
    <TransactionChartSurface title='Comparativa de ingresos y gastos' description='Evolución por mes · ARS · Período seleccionado'>
      {chartDataOutcome.length===0
        ? <TransactionChartEmpty>No hay movimientos registrados para este gráfico en el período.</TransactionChartEmpty>
        : (<AreaChart
          	className='mt-5 h-56 sm:h-72'
          	data={chartDataOutcome}
          	index='monthLabel'
          	categories={['Ingresos', 'Gastos', 'Compra Divisas']}
          	colors={['green', 'red', 'blue']}
          	valueFormatter={valueFormatter}
          	yAxisWidth={30}
          	showYAxis={false}
          />)}
    </TransactionChartSurface>
	);
};

export default IncomeExpenseLineChart;
