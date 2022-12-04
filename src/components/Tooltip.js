import React from 'react';

const Tooltip = ({ title, subtitle }) => {
	const showTooltip = () => {
		document.getElementById('tooltip2')?.classList?.remove('hidden');
	};

	const hideTooltip = () => {
		document.getElementById('tooltip2')?.classList?.add('hidden');
	};

	return (
		<>
			<a
				tabIndex='0'
				role='link'
				aria-label='tooltip2'
				className='ml-2 overflow'
				onMouseOver={showTooltip}
				onMouseOut={hideTooltip}
			>
				<svg
					aria-haspopup='true'
					xmlns='http://www.w3.org/2000/svg'
					className='icon icon-tabler icon-tabler-info-circle'
					width='25'
					height='25'
					viewBox='0 0 24 24'
					strokeWidth='1.5'
					stroke='#A0AEC0'
					fill='none'
					strokeLinecap='round'
					strokeLinejoin='round'
				>
					<path stroke='none' d='M0 0h24v24H0z' />
					<circle cx='12' cy='12' r='9' />
					<line x1='12' y1='8' x2='12.01' y2='8' />
					<polyline points='11 12 12 12 12 16 13 16' />
				</svg>

				<div
					id='tooltip2'
					role='tooltip'
					// className='z-20 w-60 absolute transition duration-150 ease-in-out mr-2 shadow-lg bg-purple-500 mt-2 p-2 rounded'
					className='z-20 w-60 absolute duration-150 ease-in-out shadow-lg bg-purple-500 mt-2 p-4 rounded'
				>
					<p className='text-sm font-bold text-white pb-1'>{title}</p>
					<p className='text-xs leading-4 text-white pb-3'>{subtitle}</p>
				</div>
			</a>
		</>
	);
};

export default Tooltip;
