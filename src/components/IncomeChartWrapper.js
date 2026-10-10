// IncomeChartWrapper.js

import React from 'react';
import CategoryBreakdownChart from './CategoryBreakdownChart';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

const IncomeChartWrapper = ({ chartData, categories }) => {
	const records = Array.isArray(chartData) ? chartData : [];
	const catalog = Array.isArray(categories) ? categories : [];
	const generateChartData = () => {
		const filteredData = records.filter((dataItem) => {
			if (typeof dataItem?.category !== 'string') return false;
			const isExpenseCategory = catalog.some(
				(category) => category?.name === dataItem.category && category.isExpense === true
			);

			// Include categories that are not expenses
			return (
				!isExpenseCategory &&
				!dataItem.category.includes(INGRESO_DIVISAS_CATEGORY)
			);
		});

		const groupedData = filteredData.reduce((result, dataItem) => {
			const { category, amount } = dataItem;

			const existingItemIndex = result.findIndex(
				(item) => item.name === category
			);

			const parsedAmount = parseFloat(amount);
			const isValidAmount = !isNaN(parsedAmount);

			if (existingItemIndex >= 0) {
				if (isValidAmount) {
					result[existingItemIndex].value += parsedAmount;
				}
			} else {
				result.push({
					name: category,
					value: isValidAmount ? parsedAmount : 0,
				});
			}

			return result;
		}, []);

		groupedData.sort((a, b) => b.value - a.value);

		return groupedData;
	};

	const generatedChartData = generateChartData();

	return (
		<CategoryBreakdownChart data={generatedChartData} title='Ingresos en pesos' currency='ARS' tone='income' />
	);
};

export default IncomeChartWrapper;
