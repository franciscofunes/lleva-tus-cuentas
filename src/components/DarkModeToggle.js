import React, { useState } from 'react';
import { DarkModeSwitch } from 'react-toggle-dark-mode';
import useDarkMode from '../shared/hooks/useDarkMode';

function DarkModeToggle() {
	const [colorTheme, setTheme] = useDarkMode();
	const [isDarkMode, setDarkMode] = useState(
		colorTheme === 'light' ? true : false
	);

	const toggleDarkMode = (checked) => {
		setTheme(colorTheme);
		setDarkMode(checked);
	};

	return (
		<div>
			<DarkModeSwitch
				className='ml-5'
				onChange={toggleDarkMode}
				checked={isDarkMode}
				size={25}
			/>
		</div>
	);
}

export default DarkModeToggle;
