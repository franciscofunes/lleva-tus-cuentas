import React, { useState } from 'react';
import { DarkModeSwitch } from 'react-toggle-dark-mode';
import useDarkMode from '../shared/hooks/useDarkMode';

function DarkModeToggle() {
	const [colorTheme, setTheme] = useDarkMode();
	const [isDarkMode, setDarkMode] = useState(colorTheme === 'light');

	const toggleDarkMode = (checked) => {
		setTheme(colorTheme);
		setDarkMode(checked);
	};

	return (
		<div
			className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
			title={isDarkMode ? 'Usar tema claro' : 'Usar tema oscuro'}
		>
			<DarkModeSwitch
				onChange={toggleDarkMode}
				checked={isDarkMode}
				size={22}
				aria-label={isDarkMode ? 'Usar tema claro' : 'Usar tema oscuro'}
			/>
		</div>
	);
}

export default DarkModeToggle;
