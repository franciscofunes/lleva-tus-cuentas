import { motion } from 'framer-motion';
import JsPDF from 'jspdf';
import React, { useEffect, useState } from 'react';
import { FaFilePdf } from 'react-icons/fa';
import { RiCheckFill } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaymentSucceed from '../imgs/paymentSucceed.svg';
import AccessDenied from '../imgs/accessDenied.svg';
import { Link } from 'react-router-dom';

const PaymentSuccess = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const [timestamp, setTimestamp] = useState('');
	const user = useSelector((state) => state.auth.user);
	const [isAuthorized, setAuthorize] = useState(true);
	const dispatch = useDispatch();

	const successVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0 },
	};

	const getQueryParametersFromLocalStorage = () => {
		const storedData = localStorage.getItem('paymentSuccessData');
		if (storedData) {
			return JSON.parse(storedData);
		}
		return null;
	};

	const generatePDF = () => {
		const report = new JsPDF();
		report.setFont('Lato-Regular', 'normal');

		report.text('Lleva tus cuentas', 20, 20).setFontSize(25);

		report.text('Pago Exitoso', 20, 30).setFontSize(20);
		report.text('Muchas gracias por su confianza', 20, 120).setFontSize(10);

		const listItems = [
			`------------------------------------------------------`,
			`* ID de Pago: ${searchParams.get('payment_id') || '-'}`,
			`* Estado: ${searchParams.get('collection_status') || '-'}`,
			`* ID de Pedido: ${searchParams.get('merchant_order_id') || '-'}`,
			`* Tipo de Pago: ${searchParams.get('payment_type') || '-'}`,
			`* Fecha: ${timestamp}`,
			`------------------------------------------------------`,
		];

		let verticalPosition = 40;

		listItems.forEach((item) => {
			report.text(item, 20, verticalPosition).setFontSize(15);
			verticalPosition += 10;
		});

		report.save('pago_exitoso.pdf');
	};

	useEffect(() => {
		const storedQueryParams = getQueryParametersFromLocalStorage();

		const storeQueryParametersInLocalStorage = () => {
			const queryParams = {
				payment_id: searchParams.get('payment_id'),
				collection_status: searchParams.get('collection_status'),
				merchant_order_id: searchParams.get('merchant_order_id'),
				payment_type: searchParams.get('payment_type'),
			};
			localStorage.setItem('paymentSuccessData', JSON.stringify(queryParams));
		};

		if (storedQueryParams) {
			setSearchParams(storedQueryParams);
		} else if (window.location.search) {
			storeQueryParametersInLocalStorage();
			navigate('/pago-exitoso');
		}

		// Generate timestamp
		const currentTimestamp = new Date().toLocaleString();
		setTimestamp(currentTimestamp);
	}, [navigate, setSearchParams, searchParams]);

	useEffect(() => {
		if (user === null) {
			setAuthorize(false);
		} else {
			setAuthorize(true);
		}
	}, [user, dispatch]);

	if (!isAuthorized) {
		return (
			<div className='flex items-center justify-center mt-10 p-4 dark:bg-gray-900'>
				<motion.div
					initial='hidden'
					animate='visible'
					variants={successVariants}
					className='max-w-3xl w-full p-4 bg-white dark:bg-gray-800 rounded-md shadow-md flex flex-col mt-4 sm:flex-row'
				>
					<div className='sm:w-1/2 p-4 flex flex-col'>
						<div className='flex items-center'>
							<h2 className='text-red-500 text-2xl font-semibold mr-2'>
								Sitio no autorizado ⛔
							</h2>
						</div>
						<p className='text-lg dark:text-indigo-400'>
							Disculpe las molestias ocasionadas
						</p>
						<Link to='/'>
							<button className='mt-4 text-white bg-indigo-500 hover-bg-indigo-600 px-4 py-2 rounded'>
								Volver
							</button>
						</Link>
					</div>
					<div className='sm:w-1/2 p-4 flex items-center justify-center'>
						<img
							src={AccessDenied}
							alt='Access Denied'
							className='w-48 h-48 sm:w-64 sm-h-64'
						/>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className='flex items-center justify-center mt-10 p-4 dark:bg-gray-900'>
			<motion.div
				initial='hidden'
				animate='visible'
				variants={successVariants}
				className='max-w-3xl w-full p-4 bg-white dark:bg-gray-800 rounded-md shadow-md flex flex-col mt-4 sm:flex-row'
			>
				<div className='sm:w-1/2 p-4 flex flex-col'>
					<div className='flex items-center'>
						<h2 className='text-green-500 text-2xl font-semibold mr-2'>
							Pago Exitoso
						</h2>
						<RiCheckFill className='text-green-500 text-2xl' />
					</div>
					<ul className='list-inside list-disc text-lg dark:text-indigo-400'>
						<li>ID de Pago: {searchParams.get('payment_id') || '-'}</li>
						<li>Estado: {searchParams.get('collection_status') || '-'}</li>
						<li>
							ID de Pedido: {searchParams.get('merchant_order_id') || '-'}
						</li>
						<li>Tipo de Pago: {searchParams.get('payment_type') || '-'}</li>
						<li>Fecha: {timestamp}</li>
					</ul>
					<button
						onClick={generatePDF}
						className='bg-purple-500 hover-bg-purple-700 mt-4 text-white font-bold py-2 px-4 rounded'
						style={{
							display: 'flex',
							alignItems: 'center',
							width: 'fit-content',
						}}
					>
						<FaFilePdf size={20} className='mr-2' />
						Descargar PDF
					</button>
				</div>
				<div className='sm:w-1/2 p-4 flex items-center justify-center'>
					<img
						src={PaymentSucceed}
						alt='Payment Succeed'
						className='w-48 h-48 sm:w-64 sm-h-64'
					/>
				</div>
			</motion.div>
		</div>
	);
};

export default PaymentSuccess;
