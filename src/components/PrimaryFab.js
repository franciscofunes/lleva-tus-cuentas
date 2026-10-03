import React from 'react';
import { FaPlusCircle } from 'react-icons/fa';
import { primaryFabClassName } from '../shared/styles/floatingAction';

const PrimaryFab = ({ onClick, ariaLabel = 'Agregar', className = '' }) => (
	<button
		type='button'
		onClick={onClick}
		aria-label={ariaLabel}
		className={`${primaryFabClassName} ${className}`}
	>
		<FaPlusCircle />
	</button>
);

export default PrimaryFab;
