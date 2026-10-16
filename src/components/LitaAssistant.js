import React, { useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';
import { requestLitaFinancialAdvice } from '../services/litaAdviceService';
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

const LitaAssistant = ({ isOpen, setIsOpen }) => {
	const [errorMessage, setErrorMessage] = useState('');
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

	const askAdvice = async (input) => {
		const message = String(input || '').trim();
		if (!message || loading) return;
		setLoading(true);
		setErrorMessage('');
		addMessage({ id: Date.now(), text: message, isAssistant: false });
		try {
			const reply = await requestLitaFinancialAdvice(message);
			addMessage({ id: Date.now() + 1, text: reply, isAssistant: true });
			setInputValue('');
		} catch (error) {
			setErrorMessage(error?.message || 'No pudimos consultar a Lita. Intentá nuevamente.');
		} finally {
			setLoading(false);
		}
	};

	const handleFormSubmit = async (event) => {
		event.preventDefault();
		await askAdvice(inputValue);
	};

	const handleOptionClick = async (option) => askAdvice(option);

	const predefinedOptions = [
		'Consejos de finanzas domésticas',
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
			{errorMessage && <p role='alert' className='mt-3 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300'>{errorMessage}</p>}
		</div>
	);
};

export default LitaAssistant;
