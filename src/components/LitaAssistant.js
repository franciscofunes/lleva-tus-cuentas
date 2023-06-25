import React, { useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';
import { openaiQuery } from '../shared/config/openAI/openAi.config';
import { WELCOME_MESSAGE_TEXT } from '../shared/constants/listaAssitant.const';

const TypewriterText = ({ text }) => {
	const [currentText, setCurrentText] = useState('');

	useEffect(() => {
		let currentIndex = 0;
		const typingInterval = setInterval(() => {
			if (text && currentIndex < text.length - 1) {
				setCurrentText((prevText) => prevText + text[currentIndex]);
				currentIndex++;
			} else {
				clearInterval(typingInterval);
			}
		}, 60);

		return () => {
			clearInterval(typingInterval);
		};
	}, [text]);

	return <div>{currentText}</div>;
};

const ErrorModal = ({ onClose }) => {
	return (
		<div className='fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75'>
			<div className='bg-white p-6 rounded-lg shadow-lg'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='text-xl font-bold'>Error: API Key inválida</h2>
					<button onClick={onClose}>
						<IoMdClose className='h-6 w-6 text-gray-600 hover:text-gray-800 transition duration-150 ease-in-out cursor-pointer' />
					</button>
				</div>
				<p className='text-gray-700'>
					No estas suscripto a nuestro servicio premium
				</p>
			</div>
		</div>
	);
};

const LitaAssistant = ({ isOpen, setIsOpen }) => {
	const [showModal, setShowModal] = useState(false);
	const [messages, setMessages] = useState([
		{
			id: Date.now(),
			text: WELCOME_MESSAGE_TEXT,
			isAssistant: true,
		},
	]);
	const [inputValue, setInputValue] = useState('');
	const [loading, setLoading] = useState(false);

	const handleInputChange = (e) => {
		setInputValue(e.target.value);
	};

	const addMessage = (message) => {
		setMessages((prevMessages) => [...prevMessages, message]);
	};

	const handleFormSubmit = async (e) => {
		e.preventDefault();

		if (inputValue.trim() === '') {
			return;
		}

		setLoading(true);

		try {
			const userMessage = {
				id: Date.now(),
				text: inputValue || '',
				isAssistant: false,
			};

			addMessage(userMessage);

			const result = await openaiQuery({
				prompt: inputValue || '',
				model: 'text-davinci-003',
				temperature: 0.8,
				max_tokens: 50,
			});

			const assistantMessage = {
				id: Date.now() + 1,
				text: result ?? '',
				isAssistant: true,
			};

			addMessage(assistantMessage);
		} catch (error) {
			if (
				error.response &&
				error.response.data &&
				error.response.data.error &&
				error.response.data.error.message
			) {
				setShowModal(true);
			} else {
				console.log(error);
			}
		}

		setLoading(false);
		setInputValue('');
	};

	const handleOptionClick = async (option) => {
		const newMessage = {
			id: Date.now(),
			text: option || '',
			isAssistant: false,
		};

		addMessage(newMessage);

		setLoading(true);
		try {
			const result = await openaiQuery({
				prompt: option,
				model: 'text-davinci-003',
				temperature: 0.8,
				max_tokens: 50,
			});

			const assistantMessage = {
				id: Date.now() + 1,
				text: result || '',
				isAssistant: true,
			};

			addMessage(assistantMessage);
		} catch (error) {
			if (error.message === '401') {
				setShowModal(true);
			} else {
				console.log(error);
			}
		}

		setLoading(false);
	};

	const handleCloseModal = () => {
		setShowModal(false);
	};

	const predefinedOptions = [
		'Consejos Economía doméstica',
		'Consejos Ahorro',
		'Consejos Presupuestos',
	];

	return (
		<div
			className={`${
				isOpen ? 'block' : 'hidden'
			} fixed p-2 right-0 bottom-0 w-80 md:float-right md:h-full rounded-tl-3xl bg-white shadow-lg dark:bg-slate-900`}
		>
			<div className='flex justify-between items-center bg-gray-100 rounded-tl-3xl p-4 dark:bg-gray-900'>
				<h2 className='text-lg font-bold dark:text-white'>LITA 🤖</h2>
				<button onClick={() => setIsOpen(false)}>
					<IoMdClose className='h-6 w-6 text-gray-600 hover:text-gray-800 dark:text-white' />
				</button>
			</div>
			<div className='border rounded-tl-3xl p-4 h-80 overflow-y-auto dark:border-indigo-500'>
				{messages.map((message, index) => (
					<div
						key={message.id}
						className={`flex mb-2 ${
							message.isAssistant ? 'justify-start' : 'justify-end'
						}`}
					>
						<div
							className={`rounded-lg py-2 px-4 ${
								message.isAssistant
									? 'bg-gray-700 text-white rounded-br-3xl'
									: 'bg-gray-200 text-gray-800 rounded-bl-3xl'
							}`}
							style={{ maxWidth: '70%' }}
						>
							{message.isAssistant ? (
								<TypewriterText text={message.text} />
							) : (
								message.text
							)}
						</div>
					</div>
				))}
			</div>
			<form className='mt-4' onSubmit={handleFormSubmit}>
				<input
					type='text'
					className='border rounded-lg px-4 py-2 w-full dark:bg-gray-900 dark:text-white'
					placeholder='Escribí tu consulta financiera...'
					value={inputValue}
					onChange={handleInputChange}
					style={{ borderColor: '#4C51BF' }}
				/>
				<button
					type='submit'
					className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 mt-2 dark:bg-indigo-700'
					disabled={loading}
				>
					{loading ? 'Cargando...' : 'Enviar'}
				</button>
			</form>
			<div className='mt-4'>
				<p className='dark:text-white'>Opciones predefinidas:</p>
				{predefinedOptions.map((option) => (
					<button
						key={option}
						className='bg-gray-200 text-gray-800 rounded-lg px-4 py-2 mt-2 mr-2 dark:bg-gray-600 dark:text-white'
						onClick={() => handleOptionClick(option)}
						disabled={loading}
					>
						{option}
					</button>
				))}
			</div>
			{showModal && <ErrorModal onClose={handleCloseModal} />}
		</div>
	);
};

export default LitaAssistant;
