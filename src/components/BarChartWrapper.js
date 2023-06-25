import { BarList, Card, Title, Bold, Flex, Text } from '@tremor/react';
import React from 'react';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

const BarChartWrapper = ({ chartData, categories }) => {
	const generateChartData = () => {
		const filteredData = chartData.filter((dataItem) => {
			const isExpenseCategory = categories.find(
				(category) => category.name === dataItem.category
			)?.isExpense;
			return (
				isExpenseCategory &&
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

	const formatValue = (value) => {
		if (isNaN(value)) {
			return 'N/A';
		} else {
			const formattedValue = value
				.toFixed(2)
				.replace(/\d(?=(\d{3})+\.)/g, '$&.');
			return `AR$ ${formattedValue}`;
		}
	};

	return (
		<Card className='max-w-lg'>
			<Title>Análisis Gastos en pesos</Title>
			<Flex className='mt-4'>
				<Text>
					<Bold>Categoría</Bold>
				</Text>
				<Text>
					<Bold>Monto</Bold>
				</Text>
			</Flex>
			<BarList
				data={generatedChartData}
				className='mt-2'
				valueFormatter={formatValue}
				color='indigo'
			/>
		</Card>
	);
};

export default BarChartWrapper;
