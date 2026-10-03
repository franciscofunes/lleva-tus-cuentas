import React from 'react';
import { FaRobot } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';

const ActionButton = ({ message, icon, color, ...props }) => {
	const renderIcon = () => {
		switch (icon) {
			case 'plus':
				return <FiPlus />;
			case 'robot':
				return <FaRobot />;
			default:
				return null;
		}
	};

	return (
		<button
			className={`inline-flex gap-x-1 items-center px-4 py-2 bg-${color}-500 rounded text-sm font-medium leading-5 text-white-700 hover:bg-gray-50 focus:outline-none focus:shadow-outline-blue active:bg-gray-100 active:text-gray-700 transition ease-in-out duration-150`}
			{...props}
		>
			{renderIcon()}
			{message}
		</button>
	);
};

export default ActionButton;
