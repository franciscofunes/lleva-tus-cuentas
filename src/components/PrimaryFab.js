import React, { useState } from 'react';
import { FaPlusCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { primaryFabClassName } from '../shared/styles/floatingAction';

const PrimaryFab = ({ onClick, ariaLabel = 'Agregar', className = '' }) => {
	const [pressed, setPressed] = useState(false);

	const handleClick = () => {
		setPressed(true);
		onClick?.();
		window.setTimeout(() => setPressed(false), 260);
	};

	return (
		<motion.button
			type='button'
			onClick={handleClick}
			aria-label={ariaLabel}
			className={`${primaryFabClassName} ${className}`}
			whileTap={{ scale: 0.92 }}
		>
			<motion.span
				className='flex items-center justify-center'
				animate={{ rotate: pressed ? 135 : 0 }}
				transition={{ duration: 0.25, ease: 'easeInOut' }}
			>
				<FaPlusCircle />
			</motion.span>
		</motion.button>
	);
};

export default PrimaryFab;
