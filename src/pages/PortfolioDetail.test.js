import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PortfolioDetail from './PortfolioDetail';
import { deletePortfolioSnapshot, updatePortfolioSnapshot } from '../services/portfolioService';

jest.mock('react-router-dom', () => ({
	Link: ({ to, children, ...rest }) => require('react').createElement('a', { href: to, ...rest }, children),
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
			cbu: '2850590940090418135201',
			alias: 'banco.prueba.sintetico',
			accountNumber: '12345678909876543210',
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

test('remunerated USD account presents capital and interest separately and provides activity filters', async () => {
  render(<PortfolioDetail />);
  expect(await screen.findByTestId('remunerated-account-overview')).toBeInTheDocument();
  expect(screen.getByText('Saldo disponible registrado')).toBeInTheDocument();
  expect(screen.getByText('Retiros de capital')).toBeInTheDocument();
  expect(screen.getAllByText(/no es una pérdida/i).length).toBeGreaterThan(0);
  const capital = screen.getByRole('button', { name: 'Capital' });
  fireEvent.click(capital);
  expect(capital).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByText('Retiro de capital').length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: 'Editar verificación' }).length).toBe(2);
  fireEvent.click(screen.getByRole('button', { name: 'Intereses' }));
  expect(screen.queryByRole('button', { name: 'Editar verificación' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
  expect(screen.getAllByRole('button', { name: 'Editar verificación' }).length).toBe(2);
});

test('details use the exact Transactions page hero and shared collapsible surfaces', async () => {
  render(<PortfolioDetail />);
  const title = await screen.findByRole('heading', {name:'Caja de ahorro',level:1});
  expect(title.closest('section')).toHaveClass('rounded-2xl','bg-white','dark:bg-slate-800');
  expect(screen.getByRole('link',{name:/Volver al Portfolio/})).toHaveClass('min-h-[44px]');
  const summary=screen.getByRole('heading',{name:'Resumen de la posición'});
  const summarySection=summary.closest('section');
  expect(summarySection).toHaveClass('rounded-2xl','bg-white','dark:bg-slate-800');
  expect(summarySection.querySelector('button[aria-expanded]')).toHaveAttribute('aria-controls','portfolio-overview-content');
  const account=screen.getByRole('heading',{name:'Datos de cuenta'}).closest('section');
  expect(account.querySelector('button[aria-expanded]')).toHaveAttribute('aria-expanded','false');
  expect(account).toHaveClass('dark:bg-slate-800');
});

test('CBU, alias and account number stay hidden until the user reveals each field', async () => {
  render(<PortfolioDetail />);
  await screen.findByRole('heading',{name:'Datos de cuenta'});
  expect(screen.queryByText('2850590940090418135201')).not.toBeInTheDocument();
  expect(screen.queryByText('banco.prueba.sintetico')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Datos de cuenta/}));
  expect(screen.getByText('CBU')).toBeInTheDocument();
  expect(screen.queryByText('2850590940090418135201')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Copiar CBU'})).not.toBeInTheDocument();
  const reveal=screen.getByRole('button',{name:'Mostrar CBU'});
  expect(reveal).toHaveAttribute('aria-pressed','false');
  expect(reveal).toHaveClass('min-h-[44px]');
  fireEvent.click(reveal);
  expect(screen.getByText('2850590940090418135201')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Ocultar CBU'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('button',{name:'Copiar CBU'})).toHaveClass('h-11','w-11');
  expect(screen.queryByText('banco.prueba.sintetico')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Ocultar CBU'}));
  expect(screen.queryByText('2850590940090418135201')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Datos de cuenta/}));
  fireEvent.click(screen.getByRole('button',{name:/Datos de cuenta/}));
  expect(screen.getByRole('button',{name:'Mostrar CBU'})).toHaveAttribute('aria-pressed','false');
});

test('historical transaction controls use the shared 44px touch target size and retain filter semantics', async () => {
  render(<PortfolioDetail />);
  const edit=await screen.findAllByRole('button',{name:'Editar verificación'});
  const remove=screen.getAllByRole('button',{name:'Eliminar verificación'});
  expect(edit).toHaveLength(2);
  edit.forEach(button => expect(button).toHaveClass('h-11','w-11'));
  remove.forEach(button => expect(button).toHaveClass('h-11','w-11'));
  ['Todos','Intereses','Capital','Otros'].forEach(name =>
    expect(screen.getByRole('button',{name})).toHaveClass('min-h-[44px]'));
  ['Día','Semana','Mes'].forEach(name =>
    expect(screen.getByRole('button',{name})).toHaveClass('min-h-[44px]'));
  fireEvent.click(screen.getByRole('button',{name:'Capital'}));
  expect(screen.getByRole('button',{name:'Capital'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getAllByText('Retiro de capital').length).toBeGreaterThan(0);
  expect(deletePortfolioSnapshot).not.toHaveBeenCalled();
});

test('FCI still distinguishes NAV valuation from realized interest in the shared detail surface', async () => {
  const { subscribePortfolioPositions } = require('../services/portfolioService');
  subscribePortfolioPositions.mockImplementationOnce((uid,onData) => {
    onData([{id:'position-1',name:'FCI sintético',institution:'Gestora QA',
      category:'FCI',trackingMode:'NAV',currency:'ARS',balance:25000,
      nav:250,shares:100,publishedYtdReturn:3.12,monthlyReturns:{jan:1.2}}]);
    return () => {};
  });
  render(<PortfolioDetail />);
  expect(await screen.findByRole('heading',{name:'FCI sintético',level:1})).toBeInTheDocument();
  expect(screen.getByText('Valor cuotaparte')).toBeInTheDocument();
  expect(screen.getByText(/No se trata como ganancia realizada hasta rescatar/)).toBeInTheDocument();
  expect(screen.getByText(/Información porcentual publicada por el fondo/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Capital'})).not.toBeInTheDocument();
  expect(deletePortfolioSnapshot).not.toHaveBeenCalled();
});
