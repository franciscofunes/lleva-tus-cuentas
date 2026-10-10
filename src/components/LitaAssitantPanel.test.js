import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LitaAssistantPanel, { visibleKeyboardLayout } from './LitaAssitantPanel';

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
		expect(iframe.getAttribute('allow')).toBe('clipboard-write');
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

	test('uses the visual viewport only for an occluded mobile keyboard', () => {
		expect(visibleKeyboardLayout(
			{ height: 425.8, offsetTop: 4, scale: 1 }, 800, 390
		)).toEqual({ height: 426, top: 4 });
		expect(visibleKeyboardLayout(
			{ height: 800, offsetTop: 0, scale: 1 }, 800, 390
		)).toBeNull();
		expect(visibleKeyboardLayout(
			{ height: 425, offsetTop: 0, scale: 1 }, 800, 1200
		)).toBeNull();
		expect(visibleKeyboardLayout(
			{ height: 425, offsetTop: 0, scale: 1.25 }, 800, 390
		)).toBeNull();
	});

	test('keeps the same iframe above Android keyboard, and restores normal panel when keyboard hides', () => {
		const previousWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
		const previousHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
		const previousViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
		const events = {};
		const viewport = {
			height: 800, offsetTop: 0, scale: 1,
			addEventListener: jest.fn((name, fn) => { events[name] = fn; }),
			removeEventListener: jest.fn(),
		};
		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
		Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
		Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
		try {
			const { container, unmount } = render(
				<LitaAssistantPanel isOpen setIsOpen={jest.fn()} section='transactions' />
			);
			const iframe = screen.getByTitle('Lita Assistant');
			const panel = container.querySelector('aside');
			expect(panel.style.height).toBe('');
			act(() => {
				viewport.height = 405;
				viewport.offsetTop = 2;
				events.resize();
			});
			expect(panel.style.height).toBe('405px');
			expect(panel.style.top).toBe('2px');
			expect(panel.style.bottom).toBe('auto');
			expect(screen.getByTitle('Lita Assistant')).toBe(iframe);
			act(() => {
				viewport.height = 800;
				viewport.offsetTop = 0;
				events.resize();
			});
			expect(panel.style.height).toBe('');
			expect(screen.getByTitle('Lita Assistant')).toBe(iframe);
			unmount();
			expect(viewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
		} finally {
			if (previousWidth) Object.defineProperty(window, 'innerWidth', previousWidth);
			if (previousHeight) Object.defineProperty(window, 'innerHeight', previousHeight);
			if (previousViewport) Object.defineProperty(window, 'visualViewport', previousViewport);
			else delete window.visualViewport;
		}
	});

	test('sends a save result only after Firestore confirms the write', async () => {
		const { saveLitaChat } = require('../services/litaChatService');
		saveLitaChat.mockResolvedValueOnce(undefined);
		render(<LitaAssistantPanel isOpen setIsOpen={jest.fn()} />);
		const iframe = screen.getByTitle('Lita Assistant');
		const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');

		await act(async () => {
			window.dispatchEvent(new MessageEvent('message', {
				origin,
				source: iframe.contentWindow,
				data: { type: 'lita:history:save', payload: { requestId: 'req1', id: 'chat1', messages: [] } },
			}));
		});

		await waitFor(() => {
			expect(saveLitaChat).toHaveBeenCalled();
			expect(postMessage).toHaveBeenCalledWith({
				type: 'lita:history:save:result',
				payload: { requestId: 'req1', id: 'chat1', success: true },
			}, origin);
		});
	});

	test('sends a permission-denied save failure instead of silent success', async () => {
		const { saveLitaChat } = require('../services/litaChatService');
		saveLitaChat.mockRejectedValueOnce({ code: 'permission-denied' });
		render(<LitaAssistantPanel isOpen setIsOpen={jest.fn()} />);
		const iframe = screen.getByTitle('Lita Assistant');
		const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');

		await act(async () => {
			window.dispatchEvent(new MessageEvent('message', {
				origin,
				source: iframe.contentWindow,
				data: { type: 'lita:history:save', payload: { requestId: 'req2', id: 'chat2', messages: [] } },
			}));
		});

		await waitFor(() => {
			expect(postMessage).toHaveBeenCalledWith({
				type: 'lita:history:save:result',
				payload: { requestId: 'req2', id: 'chat2', success: false, reason: 'permission-denied' },
			}, origin);
		});
	});

	test('reports Firestore subscription permission errors to LITA', async () => {
		const { subscribeLitaChats } = require('../services/litaChatService');
		subscribeLitaChats.mockImplementationOnce((uid, onData, onError) => {
			onError({ code: 'permission-denied' });
			return () => {};
		});
		render(<LitaAssistantPanel isOpen setIsOpen={jest.fn()} />);
		const iframe = screen.getByTitle('Lita Assistant');
		const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');

		await waitFor(() => {
			expect(postMessage).toHaveBeenCalledWith({
				type: 'lita:history:status',
				payload: { state: 'error', reason: 'permission-denied' },
			}, origin);
		});
	});
});
