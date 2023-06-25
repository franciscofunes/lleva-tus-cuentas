import React from 'react';
import { FaPlusCircle } from 'react-icons/fa';
import { Fab } from 'react-tiny-fab';
import { AnimatePresence, motion } from 'framer-motion';
import 'react-tiny-fab/dist/styles.css';
import ActionButton from './ActionButton';

const FloatingMenu = ({ openTransactionModal, openLitaModal, isModalOpen }) => {
	const floatingMenuStyles = {
		backgroundColor: '#5928e5',
		color: 'white',
		height: 60,
		width: 60,
		fontSize: 30,
	};

	return (
		<AnimatePresence>
			{!isModalOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3 }}
				>
					<Fab
						mainButtonStyles={floatingMenuStyles}
						style={{ bottom: 5, right: 5 }}
						event={'click'}
						icon={<FaPlusCircle />}
					>
						<ActionButton
							color='red'
							icon='plus'
							message='Transacción'
							onClick={openTransactionModal}
						/>
						<ActionButton
							color='blue'
							icon='robot'
							message='LITA'
							onClick={openLitaModal}
						/>
					</Fab>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default FloatingMenu;
