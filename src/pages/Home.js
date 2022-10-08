import React from 'react';
import bank from '../imgs/bank.png';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

function Home() {
	const user = useSelector((state) => state.auth.user);
	return (
		<>
			<div className='max-w-screen relative  lg:px-20  flex  justify-center lg:flex-row flex-col items-center  lg:mt-0 dark:bg-gray-900'>
				<div className='container lg:block flex justify-center align-middle flex-col z-50 lg:mx-auto w-full lg:text-left text-center '>
					<motion.div
						className='w-full '
						animate={{ x: 0, opacity: 1 }}
						initial={{ x: -40, opacity: 0 }}
						transition={{
							delay: 0.2,
							duration: 0.6,
							type: 'tween',
						}}
					>
						<h1 className='uppercase font-bold lg:text-5xl text-4xl mb-2 mt-10 text-primary dark:text-white'>
							Bienvenidos
							<span className='animate-wave'>👋</span>
						</h1>
						<p className='font-normal font-Roboto lg:text-2xl text-gray-500 text-2xl mt-5 '>
							Les presentamos un gestor de finanzas personales diseñado para
							ayudarte a controlar tus gastos e ingresos diarios
						</p>
					</motion.div>
					<motion.div
						className='flex justify-center lg:block dark:bg-gray-900'
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ delay: 0.4, duration: 0.5 }}
					>
						<Link to='/signup' className='get-started-btn z-50'>
							<div>{user ? `Registar` : `Comenzar`}</div>
						</Link>
					</motion.div>
				</div>
				<motion.img
					animate={{ opacity: 1, y: 0 }}
					initial={{ y: 100, opacity: 0 }}
					transition={{
						delay: 0.5,
						duration: 0.8,
						type: 'tween',
					}}
					src={bank}
					alt='hero'
					className='lg:h-hero lg:relative z-40 h-96 w-96 top-full lg:w-hero mt-5 '
				/>
			</div>

			<svg
				xmlns='http://www.w3.org/2000/svg'
				className='absolute bottom-0 z-0 h-60 w-100 dark:bg-gray-900'
				viewBox='100 80 2000 200'
			>
				<path
					fill='#5928E5'
					fillOpacity='1'
					d='M0,0L40,37.3C80,75,160,149,240,192C320,235,400,245,480,213.3C560,181,640,107,720,112C800,117,880,203,960,234.7C1040,267,1120,245,1200,213.3C1280,181,1360,139,1400,117.3L1440,96L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z'
				></path>
			</svg>
		</>
	);
}

export default Home;
