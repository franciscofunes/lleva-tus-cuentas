import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi'; // Import the X icon from react-icons
import { useNavigate } from 'react-router-dom';

const AdvertisementContainer = ({ advertisements }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentIndex((prevIndex) => (prevIndex + 1) % advertisements.length);
		}, 5000); // Change advertisement every 5 seconds

		return () => clearInterval(timer);
	}, [advertisements.length]);

	const navigate = useNavigate();

	const handleClose = () => {
		let path = `/suscripcion`;
		navigate(path);
		setIsVisible(false);
	};

	const isMobile = window.innerWidth <= 768; // Define your breakpoint here
	const containerHeight = isMobile ? '140px' : '150px'; // Adjust the maximum height as needed

	const motionDivStyles = {
		width: isMobile ? '350px' : '320px', // Set different widths for mobile and desktop
		height: containerHeight, // Set a fixed height for the container
	};

	const maxImageHeight = `calc(${containerHeight} - 40px)`; // Subtract some padding and button height

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					className='mb-5 bg-gray-700 text-white p-4 rounded-lg'
					initial={{ opacity: 0, y: 50 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 50 }}
					style={motionDivStyles}
				>
					<div style={{ position: 'relative', height: '100%' }}>
						<motion.img
							key={currentIndex}
							src={advertisements[currentIndex]}
							alt='Advertisement'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 1 }}
							style={{
								width: '100%', // Adjust the width of the image
								maxHeight: maxImageHeight, // Set a maximum height for the image
								objectFit: 'contain', // Fit the image within the container
								filter: 'contrast(1.0)',
							}}
						/>
						<button
							onClick={handleClose}
							className='text-sm text-gray-300 hover:text-white'
							style={{
								background: 'rgba(0, 0, 0, 0.5)', // Add background to make it more visible
								borderRadius: '50%', // Make it a circle
								padding: '4px', // Add some padding for spacing
								position: 'absolute',
								top: '2px',
								right: '2px',
							}}
						>
							<FiX />
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default AdvertisementContainer;
