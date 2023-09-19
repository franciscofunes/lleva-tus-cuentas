import React from 'react';
import { IoMdClose } from 'react-icons/io';
import { motion, AnimatePresence } from 'framer-motion';
import {
	LITA_CHAT_LOCALHOST,
	LITA_CHAT_VERCEL_URL,
} from '../shared/constants/urls.const';

const LitaAssistantPanel = ({ isOpen, setIsOpen }) => {
	const variants = {
		hidden: { opacity: 0, x: '100%' },
		visible: { opacity: 1, x: '0%', transition: { duration: 0.3 } },
	};

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
						src={LITA_CHAT_LOCALHOST}
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
