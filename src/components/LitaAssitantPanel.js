import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { IoMdClose } from 'react-icons/io';
import { useSelector } from 'react-redux';
import {
	LITA_CHAT_LOCALHOST,
	LITA_CHAT_VERCEL_URL,
} from '../shared/constants/urls.const';

const LitaAssistantPanel = ({ isOpen, setIsOpen }) => {
	const variants = {
		hidden: { opacity: 0, x: '100%' },
		visible: { opacity: 1, x: '0%', transition: { duration: 0.3 } },
	};

	const docs = useSelector((state) => state.database.docs);

	// Add an event listener to listen for messages from the iframe
	window.addEventListener('message', (event) => {
		if (event.data === 'closeLitaPanel') {
			const closeButton = document.getElementById(
				'lita-assistant-panel-close-button'
			);

			if (closeButton) {
				closeButton.click();
			}
		}
	});

	window.addEventListener('message', (event) => {
		if (event.data === 'getLastFiveUserTransactions') {
			const baseUrl =
				process.env.NODE_ENV === 'development'
					? 'http://localhost:3005' // Local development URL
					: 'https://holalita.vercel.app'; // Deployed URL

			// Add fetch request to send user context data to the Next.js API
			fetch(`${baseUrl}/api/user-transactions`, {
				method: 'POST',
				mode: 'no-cors',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(docs.slice(0, 5)),
			})
				.then((response) => {
					if (response.ok) {
						console.log('User transactions sent successfully to Next.js API');
					} else {
						console.error('Failed to send user transactions to Next.js API');
					}
				})
				.catch((error) => {
					console.error(
						'Error sending user transactions to Next.js API',
						error
					);
				});
		}
	});

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					key='panel' // Add a unique key to enable animations during re-renders
					className='fixed right-0 bottom-0 w-[90%] md:w-[300px] lg:w-[400px] xl:w-[500px] 2xl:w-[600px] bg-white shadow-lg dark:bg-slate-900 flex flex-col h-full'
					initial='hidden'
					animate='visible'
					exit='hidden'
					variants={variants}
				>
					<div className='flex justify-between items-center bg-gray-100 rounded-tl-3xl p-4 dark:dark:bg-slate-900'>
						<h2 className='text-lg font-bold dark:text-white'>LITA 🤖</h2>
						<button
							onClick={() => setIsOpen(false)}
							id='lita-assistant-panel-close-button'
						>
							<IoMdClose className='h-6 w-6 text-gray-600 hover:text-gray-800 dark:text-white' />
						</button>
					</div>

					<iframe
						src={
							process.env.NODE_ENV === 'development'
								? LITA_CHAT_LOCALHOST
								: LITA_CHAT_VERCEL_URL
						}
						title='Lita Assistant'
						className='w-full h-full border-none'
						style={{ minHeight: '500px', overflow: 'hidden' }}
						// onLoad={handleIframeLoad}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default LitaAssistantPanel;
