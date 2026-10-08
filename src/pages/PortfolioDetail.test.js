import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PortfolioDetail from './PortfolioDetail';
import { deletePortfolioSnapshot, updatePortfolioSnapshot } from '../services/portfolioService';

jest.mock('react-router-dom', () => ({
	Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
	Navigate: () => null,
	useParams: () => ({ positionId: 'position-1' }),
}));
jest.mock('react-redux', () => {
	const stableState = { auth: { user: { uid: 'user-1' } } };
	return { useSelector: (selector) => selector(stableState) };
});
jest.mock('react-toastify', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('../components/AppFooter', () => () => null);
jest.mock('../services/portfolioService', () => ({
	subscribePortfolioPositions: jest.fn((uid, onData) => {
		onData([{
			id: 'position-1',
			institution: 'Banco ejemplo',
			name: 'Caja de ahorro',
			category: 'Cuenta remunerada',
			currency: 'USD',
			balance: 11000,
			interestRate: 1.75,
		}]);
		return () => {};
	}),
	subscribePortfolioSnapshots: jest.fn((uid, onData) => {
		onData([{
			id: 'snapshot-1',
			positionId: 'position-1',
			capturedAt: new Date('2026-10-08T14:41:23Z'),
			balance: 11000,
			observedEarning: -128.53,
			expectedEarning: 0.55,
			confirmedEarning: 0,
			changeType: 'withdrawal',
			note: 'Retiro registrado',
		}]);
		return () => {};
	}),
	subscribePortfolioReconciliations: jest.fn((uid, onData) => {
		onData([]);
		return () => {};
	}),
	updatePortfolioSnapshot: jest.fn(() => Promise.resolve()),
	deletePortfolioSnapshot: jest.fn(() => Promise.resolve()),
	savePortfolioReconciliation: jest.fn(() => Promise.resolve()),
	registerReconciliationTransaction: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
	jest.clearAllMocks();
	window.localStorage.clear();
});

test('mobile edit action opens modal instead of an inline form and persists the new classification', async () => {
	render(<PortfolioDetail />);
	const editButtons = await screen.findAllByRole('button', { name: 'Editar verificación' });
	expect(editButtons.length).toBe(2); // Mobile card and desktop table.
	fireEvent.click(editButtons[0]);

	expect(screen.getByRole('dialog', { name: 'Editar verificación' })).toBeInTheDocument();
	fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target: { value: 'earning' } });
	fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

	await waitFor(() => {
		expect(updatePortfolioSnapshot).toHaveBeenCalledWith(
			'user-1',
			'snapshot-1',
			expect.objectContaining({ changeType: 'earning', balance: 11000, observedEarning: -128.53 }),
		);
	});
});

test('mobile delete action opens confirmation modal and does not delete on Cancel', async () => {
	render(<PortfolioDetail />);
	const deleteButtons = await screen.findAllByRole('button', { name: 'Eliminar verificación' });
	expect(deleteButtons.length).toBe(2);
	fireEvent.click(deleteButtons[0]);

	expect(screen.getByRole('dialog', { name: 'Eliminar verificación' })).toBeInTheDocument();
	expect(deletePortfolioSnapshot).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	expect(deletePortfolioSnapshot).not.toHaveBeenCalled();

	fireEvent.click(deleteButtons[1]);
	fireEvent.click(screen.getByRole('button', { name: 'Eliminar verificación' }));
	await waitFor(() => expect(deletePortfolioSnapshot).toHaveBeenCalledWith('user-1', 'snapshot-1'));
});
