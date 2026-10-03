import React from 'react';
import { FaPlusCircle } from 'react-icons/fa';

const PrimaryFab = ({ onClick, ariaLabel = 'Agregar', className = '' }) => (
	<button type='button' onClick={onClick} aria-label={ariaLabel}
		className={`fixed z-40 right-5 bottom-5 w-[60px] h-[60px] rounded-full bg-secondary text-white shadow-xl flex items-center justify-center text-[30px] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-purple-400 ${className}`}>
		<FaPlusCircle />
	</button>
);
export default PrimaryFab;
