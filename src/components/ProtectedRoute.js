import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const RouteLoadingState = () => (
	<main className='min-h-[calc(100dvh-4.5rem)] bg-slate-50 px-4 py-6 dark:bg-gray-900'>
		<div
			className='mx-auto w-full max-w-7xl animate-pulse space-y-5'
			aria-label='Verificando sesión'
		>
			<div className='h-28 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800' />
			<div className='grid gap-4 sm:grid-cols-3'>
				{[0, 1, 2].map((item) => (
					<div
						key={item}
						className='h-28 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
					/>
				))}
			</div>
			<div className='h-64 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800' />
		</div>
	</main>
);

function ProtectedRoute({ children }) {
	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);
	const location = useLocation();

	if (isFetching) {
		return <RouteLoadingState />;
	}

	if (!user) {
		return (
			<Navigate
				to='/ingresar'
				replace
				state={{ from: location }}
			/>
		);
	}

	return children;
}

export default ProtectedRoute;
