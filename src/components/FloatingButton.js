import React, { useState } from 'react';

const FloatingButton = () => {
	const [menuOpen, setMenuOpen] = useState(false);

	const toggleMenu = () => setMenuOpen(!menuOpen);

	return (
		<div className='fixed bottom-0 right-0 m-4'>
			<button
				className='btn-floating bg-primary-500 text-white'
				onClick={toggleMenu}
			>
				<i className='fas fa-plus' />
			</button>
			<div
				className={`menu-content bg-base-100 shadow rounded-box ${
					menuOpen ? 'block' : 'hidden'
				}`}
			>
				<a className='block p-2 text-base font-bold text-primary-500 hover:bg-gray-200'>
					Option 1
				</a>
				<a className='block p-2 text-base font-bold text-primary-500 hover:bg-gray-200'>
					Option 2
				</a>
			</div>
		</div>
	);
};

export default FloatingButton;
