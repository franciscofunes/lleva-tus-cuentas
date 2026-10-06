import { motion } from 'framer-motion';
import { FaChartPie, FaExchangeAlt } from 'react-icons/fa';
import { FiUserPlus } from 'react-icons/fi';
import { ImEnter } from 'react-icons/im';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { logOutAction } from '../actionCreators/authActions';
import AvatarDropdown from './AvatarDropdown';
import DarkModeToggle from './DarkModeToggle';
import NotificationsDropdown from './NotificationsDropdown';

const navItemClass = ({ isActive }) =>
	[
		'inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors',
		isActive
			? 'bg-purple-600 text-white shadow-sm'
			: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
	].join(' ');

function Navbar() {
	const user = useSelector((state) => state.auth.user);
	const isFetching = useSelector((state) => state.auth.isFetching);
	const location = useLocation();
	const dispatch = useDispatch();

	const handleLogout = () => {
		dispatch(logOutAction());
	};

	const isLogin = location.pathname === '/ingresar';
	const isSignUp = location.pathname === '/registrarse';
	const isRecovery = location.pathname === '/recupero';

	const guestActions = () => {
		if (isFetching) {
			return (
				<div
					className='flex items-center gap-2'
					aria-label='Verificando sesión'
				>
					<div className='hidden sm:block h-10 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700' />
					<div className='h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700' />
				</div>
			);
		}

		if (user) return null;

		return (
			<div className='flex items-center gap-2'>
				{!isLogin && (
					<Link
						to='/ingresar'
						className='inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
					>
						<ImEnter className='text-base' />
						<span className={isSignUp ? 'inline' : 'hidden sm:inline'}>Ingresar</span>
					</Link>
				)}

				{!isSignUp && !isRecovery && (
					<Link
						to='/registrarse'
						className='inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-purple-600 px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-purple-700'
					>
						<FiUserPlus className='text-base' />
						<span className='hidden sm:inline'>Registrarme</span>
					</Link>
				)}
			</div>
		);
	};

	return (
		<motion.nav
			animate={{ opacity: 1 }}
			initial={{ opacity: 0 }}
			transition={{ delay: 0.05, duration: 0.3 }}
			className='sticky top-0 z-[70] border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95'
			aria-label='Navegación principal'
		>
			<div className='mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8'>
				<Link
					to={user ? '/transacciones' : '/'}
					className='shrink-0 font-Montserrat text-3xl font-extrabold tracking-wider text-slate-900 dark:text-white'
					aria-label={user ? 'Ir a Transacciones' : 'Ir al inicio'}
				>
					LTC<span className='text-green-600'>$</span>
				</Link>

				{user && !isFetching && (
					<div className='hidden lg:flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/70'>
						<NavLink to='/transacciones' className={navItemClass}>
							<FaExchangeAlt />
							Transacciones
						</NavLink>
						<NavLink to='/portfolio' className={navItemClass}>
							<FaChartPie />
							Portfolio
						</NavLink>
					</div>
				)}

				<div className='flex min-w-0 items-center gap-1.5 sm:gap-2'>
					{user && !isFetching ? (
						<>
							<NotificationsDropdown />
							<DarkModeToggle />
							<AvatarDropdown user={user} handleLogout={handleLogout} />
						</>
					) : (
						<>
							{guestActions()}
							<DarkModeToggle />
						</>
					)}
				</div>
			</div>
		</motion.nav>
	);
}

export default Navbar;
