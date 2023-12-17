import React from 'react';
import { motion } from 'framer-motion';

const ChartToggleMenu = ({
	selectedChart,
	handleChartToggle,
	chartComponents,
}) => {
	const circleVariants = {
		initial: { scale: 1 },
		hover: { scale: 1.2, boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' },
	};

	return (
		<div className='flex m-4'>
			{Object.keys(chartComponents).map((key) => (
				<motion.div
					key={key}
					initial='initial'
					whileHover='hover'
					variants={circleVariants}
					className={`cursor-pointer w-4 h-4 rounded-full mx-1 ${
						selectedChart === key ? 'bg-indigo-500' : 'bg-gray-300'
					}`}
					onClick={() => handleChartToggle(key)}
				></motion.div>
			))}
		</div>
	);
};

export default ChartToggleMenu;
