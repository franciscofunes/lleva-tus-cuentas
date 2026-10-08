import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LitaAssistantPanel from './LitaAssitantPanel';

jest.mock('react-redux', () => ({
	useSelector: (selector) => selector({ auth: { user: { uid: 'test-user' } } }),
}));
jest.mock('../services/litaChatService', () => ({
	subscribeLitaChats: jest.fn(() => () => {}),
	saveLitaChat: jest.fn(() => Promise.resolve()),
	deleteLitaChat: jest.fn(() => Promise.resolve()),
}));
jest.mock('../shared/constants/urls.const', () => ({
	LITA_CHAT_LOCALHOST: 'http://localhost:3005',
	LITA_CHAT_VERCEL_URL: 'https://holalita.vercel.app/',
}));

const origin = 'https://holalita.vercel.app';

describe('LITA iframe integration', () => {
	beforeEach(() => {
		document.documentElement.classList.remove('dark');
		document.body.style.overflow = '';
	});

	afterEach(() => {
		jest.restoreAllMocks();
		document.documentElement.classList.remove('dark');
	});

	test('sends the current theme when ready and on subsequent theme changes', async () => {
		const setIsOpen = jest.fn();
		render(<LitaAssistantPanel isOpen setIsOpen={setIsOpen} section='portfolio' />);
		const iframe = screen.getByTitle('Lita Assistant');
		const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');

		act(() => {
			window.dispatchEvent(new MessageEvent('message', {
				origin,
				source: iframe.contentWindow,
				data: { type: 'lita:ready' },
			}));
		});
		expect(postMessage).toHaveBeenCalledWith({ type: 'lita:theme', payload: 'light' }, origin);

		act(() => {
			document.documentElement.classList.add('dark');
		});
		await waitFor(() => {
			expect(postMessage).toHaveBeenCalledWith({ type: 'lita:theme', payload: 'dark' }, origin);
		});

		// A foreign window must not be able to close or resize the panel.
		act(() => {
			window.dispatchEvent(new MessageEvent('message', {
				origin,
				data: { type: 'lita:close' },
			}));
		});
		expect(setIsOpen).not.toHaveBeenCalled();
	});

	test('expands to viewport and restores without remounting the chat iframe', () => {
		const { container } = render(
			<LitaAssistantPanel isOpen setIsOpen={jest.fn()} section='portfolio' />
		);
		const iframe = screen.getByTitle('Lita Assistant');
		expect(document.body.style.overflow).toBe('hidden');
		expect(container.querySelector('aside').className).toContain('max-h-[720px]');

		fireEvent.click(screen.getByRole('button', { name: 'Expandir LITA a pantalla completa' }));
		expect(container.querySelector('aside').className).toContain('h-[100dvh]');
		expect(screen.getByTitle('Lita Assistant')).toBe(iframe);

		fireEvent.click(screen.getByRole('button', { name: 'Restaurar tamaño de LITA' }));
		expect(container.querySelector('aside').className).toContain('max-h-[720px]');
		expect(screen.getByTitle('Lita Assistant')).toBe(iframe);
	});
});
