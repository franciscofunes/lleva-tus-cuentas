import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import useDarkMode from '../shared/hooks/useDarkMode';

function DarkModeToggle() {
	const [colorTheme, setTheme] = useDarkMode();
	const isDarkMode = colorTheme === 'light';

	const toggleDarkMode = () => {
		setTheme(isDarkMode ? 'light' : 'dark');
	};

	return (
		<button
			type='button'
			onClick={toggleDarkMode}
			onPointerUp={(event) => {
				if (event.pointerType !== 'mouse') {
					event.currentTarget.blur();
				}
			}}
			className='inline-flex h-10 w-10 select-none items-center justify-center rounded-xl border border-transparent text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-slate-200 dark:hover:bg-slate-800'
			style={{ WebkitTapHighlightColor: 'transparent' }}
			aria-label={isDarkMode ? 'Usar tema claro' : 'Usar tema oscuro'}
			aria-pressed={isDarkMode}
			title={isDarkMode ? 'Usar tema claro' : 'Usar tema oscuro'}
		>
			{isDarkMode ? (
				<FaMoon className='h-[22px] w-[22px]' aria-hidden='true' />
			) : (
				<FaSun className='h-[22px] w-[22px]' aria-hidden='true' />
			)}
		</button>
	);
}

export default DarkModeToggle;
