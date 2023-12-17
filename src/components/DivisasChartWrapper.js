import React from 'react';
import { BarList, Card, Title, Bold, Flex, Text } from '@tremor/react';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';

const DivisasChartWrapper = ({ chartData, categories }) => {
	const generateChartData = () => {
		const filteredData = chartData.filter((dataItem) => {
			const isIngresoDivisasCategory = dataItem.category.includes(
				INGRESO_DIVISAS_CATEGORY
			);

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

	const formatValue = (value) => {
		if (isNaN(value)) {
			return 'N/A';
		} else {
			const formattedValue = value
				.toFixed(2)
				.replace(/\d(?=(\d{3})+\.)/g, '$&.');
			return `US$ ${formattedValue}`;
		}
	};

	return (
		<Card className='max-w-lg'>
			<Title>Ingresos en divisas</Title>
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

export default DivisasChartWrapper;
