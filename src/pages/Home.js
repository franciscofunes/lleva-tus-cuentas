import React from 'react';
import bank from '../imgs/bank.png';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import wavesFooter from '../imgs/waves.svg';

function Home() {
	const user = useSelector((state) => state.auth.user);
	return (
		<>
			<div className='max-w-screen relative lg:px-20 flex justify-center lg:flex-row flex-col items-center lg:mt-0 dark:bg-gray-900 z-40'>
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
							<button className='animate-wave'>👋</button>
						</h1>
						<div className='font-normal font-Roboto lg:text-2xl text-2xl mt-5'>
							<p className='text-gray-gradient'>
								Con nuestra intuitiva y fácil de usar plataforma, podrás
								mantener un seguimiento preciso de tus transacciones
								financieras, desde las compras diarias hasta los ingresos
								adicionales
							</p>
						</div>
					</motion.div>
					<motion.div
						className='flex justify-center lg:block'
						animate={{ opacity: 1 }}
						initial={{ opacity: 0 }}
						transition={{ delay: 0.4, duration: 0.5 }}
					>
						<Link
							to={user ? '/ingresar' : '/registrarse'}
							className='get-started-btn z-50'
						>
							<div>{user ? `Abrir` : `Comenzar`}</div>
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
					className='lg:h-auto lg:relative z-40 h-full w-full top-full lg:w-hero mt-2'
				/>
			</div>
			<div className='absolute bottom-0 left-0 w-full z-50'>
				<img src={wavesFooter} alt='purple waves footer' className='w-full' />
			</div>
		</>
	);
}

export default Home;
