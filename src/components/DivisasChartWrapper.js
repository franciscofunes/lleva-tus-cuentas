import React from 'react';
import CategoryBreakdownChart from './CategoryBreakdownChart';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

const DivisasChartWrapper = ({ chartData, categories }) => {
	const records = Array.isArray(chartData) ? chartData : [];
	const catalog = Array.isArray(categories) ? categories : [];
	const generateChartData = () => {
		const filteredData = records.filter((dataItem) => {
			const isIngresoDivisasCategory = typeof dataItem?.category === 'string' &&
				dataItem.category.includes(INGRESO_DIVISAS_CATEGORY);

			// Include only categories that are INGRESO_DIVISAS_CATEGORY
			return isIngresoDivisasCategory;
		});

		const groupedData = filteredData.reduce((result, dataItem) => {
			const { category, currencyQuantity } = dataItem;

			if (currencyQuantity !== undefined) {
				// Check if currencyQuantity is defined
				const parsedQuantity = parseFloat(currencyQuantity);
				const isValidQuantity = !isNaN(parsedQuantity);

				if (isValidQuantity) {
					const existingItemIndex = result.findIndex(
						(item) => item.name === category
					);

					if (existingItemIndex >= 0) {
						result[existingItemIndex].value += parsedQuantity;
					} else {
						result.push({
							name: category,
							value: parsedQuantity,
						});
					}
				}
			}

			return result;
		}, []);

		groupedData.sort((a, b) => b.value - a.value);

		return groupedData;
	};

	const generatedChartData = generateChartData();

	return (
		<CategoryBreakdownChart data={generatedChartData} title='Ingresos en dólares' currency='USD' tone='usd' />
	);
};

export default DivisasChartWrapper;
