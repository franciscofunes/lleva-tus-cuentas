import { motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { RiCheckFill } from 'react-icons/ri';
import { FaFilePdf } from 'react-icons/fa'; // Import the FaFilePdf icon
import { useSearchParams, useNavigate } from 'react-router-dom';
import PaymentSucceed from '../imgs/paymentSucceed.svg';
import JsPDF from 'jspdf';

const PaymentSuccess = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const successVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0 },
	};

	// Define a function to store the query parameters in local storage
	const storeQueryParametersInLocalStorage = () => {
		const queryParams = {
			payment_id: searchParams.get('payment_id'),
			collection_status: searchParams.get('collection_status'),
			merchant_order_id: searchParams.get('merchant_order_id'),
			payment_type: searchParams.get('payment_type'),
		};
		localStorage.setItem('paymentSuccessData', JSON.stringify(queryParams));
	};

	// Define a function to retrieve the query parameters from local storage
	const getQueryParametersFromLocalStorage = () => {
		const storedData = localStorage.getItem('paymentSuccessData');
		if (storedData) {
			return JSON.parse(storedData);
		}
		return null;
	};

	// Define a function to generate and export the PDF
	const generatePDF = () => {
		const report = new JsPDF('portrait', 'pt', 'a4');
		report.html(document.querySelector('#report')).then(() => {
			report.save('report.pdf');
		});
	};

	useEffect(() => {
		const storedQueryParams = getQueryParametersFromLocalStorage();

		if (storedQueryParams) {
			setSearchParams(storedQueryParams);
		} else if (window.location.search) {
			storeQueryParametersInLocalStorage();
			navigate('/pago-exitoso');
		}
	}, [navigate, setSearchParams]);

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
					</ul>
					<div className='text-center mt-4'>
						<button
							onClick={generatePDF}
							className='bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex'
						>
							<FaFilePdf size={20} className='mr-2' />
							Descagar PDF
						</button>
					</div>
				</div>
				<div className='sm:w-1/2 p-4 flex items-center justify-center'>
					<img
						src={PaymentSucceed}
						alt='Payment Succeed'
						className='w-48 h-48 sm:w-64 sm:h-64'
					/>
				</div>
			</motion.div>
		</div>
	);
};

export default PaymentSuccess;
