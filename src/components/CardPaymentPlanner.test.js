import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CardPaymentPlanner from './CardPaymentPlanner';

const props = {
  banks: [{ code: 'bank1', name: 'Banco Uno' }, { code: 'bank2', name: 'Banco Dos' }],
  accounts: [
    { id: 'ars', bankId: 'bank1', name: 'Cuenta ARS', currency: 'ARS', balance: 20000.53 },
    { id: 'usd', bankId: 'bank1', name: 'Cuenta USD', currency: 'USD', balance: 500 },
    { id: 'wallet', bankId: 'wallet', name: 'Billetera USD', currency: 'USD', balance: 3000 },
  ],
  cards: [
    { id: 'c1', bankId: 'bank1', nickname: 'Visa 1111', statementSnapshot: { lastStatementARS: 150000.45, lastStatementUSD: 100.2 } },
    { id: 'c2', bankId: 'bank2', nickname: 'Visa 2222', statementSnapshot: { lastStatementARS: 50000.81, lastStatementUSD: 0 } },
  ],
  statements: [], links: [], privacyHidden: false, onRevealValues: jest.fn(),
};

test('hides all amounts and inputs from the DOM when Bancos privacy is active', () => {
  const onRevealValues = jest.fn();
  render(<CardPaymentPlanner {...props} privacyHidden onRevealValues={onRevealValues}/>);
  expect(screen.queryByText(/150.000/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Cotización de venta (ARS por 1 USD)')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar importes' }));
  expect(onRevealValues).toHaveBeenCalledTimes(1);
});

test('combines two existing cards, separate account balances, and opt-in perception', () => {
  render(<CardPaymentPlanner {...props}/>);
  const chooser = screen.getByLabelText('Tarjeta registrada');
  fireEvent.change(chooser, { target: { value: 'c1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar tarjeta' }));
  fireEvent.change(chooser, { target: { value: 'c2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar tarjeta' }));
  const firstCard = screen.getByRole('article', { name: 'Pago planificado Banco Uno · Visa 1111' });
  fireEvent.change(within(firstCard).getByLabelText('Percepción RG 5617 en ARS'), { target: { value: '30000.11' } });
  fireEvent.change(screen.getByLabelText('Cuenta para pagar ARS'), { target: { value: 'ars' } });
  fireEvent.change(screen.getByLabelText('Cuenta para pagar USD'), { target: { value: 'usd' } });
  fireEvent.change(screen.getByLabelText('Cuenta donde vender USD'), { target: { value: 'wallet' } });
  fireEvent.change(screen.getByLabelText('Cotización de venta (ARS por 1 USD)'), { target: { value: '1500.57' } });
  fireEvent.click(screen.getByLabelText(/Confirmo que puedo descontar la percepción/));
  const results = screen.getByRole('region', { name: 'Resultado del plan de pago' });
  expect(within(results).getByText('USD 99,97')).toBeInTheDocument();
  expect(within(results).getByText('ARS 150.000,62')).toBeInTheDocument();
  expect(screen.queryByText(/No se descontó la percepción/)).not.toBeInTheDocument();
  // Shared opaque Transactions card surface and a genuine dark nested surface.
  expect(firstCard.className).toContain('dark:bg-slate-800');
  expect(firstCard.className).not.toContain('bg-white/70');
  expect(screen.getByRole('region', { name: 'Fondos y cotización' }).className).toContain('dark:bg-slate-900/70');
});

test('manual cards work without bank records and do not save financial data', () => {
  render(<CardPaymentPlanner {...props} banks={[]} accounts={[]} cards={[]}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Agregar manualmente' }));
  expect(screen.getByLabelText('Nombre de la tarjeta')).toBeInTheDocument();
  expect(screen.getByText(/no vende divisas, paga tarjetas ni registra gastos/)).toBeInTheDocument();
});

test('prefills a linked PDF but never assumes its aggregate taxes are deductible RG 5617', () => {
  render(<CardPaymentPlanner {...props}
    statements={[{ expenseId: 'expense-1', dueDate: '2026-12-10', totals: { ARS: '777.11', USD: '1.00' }, taxesArs: '123.45' }]}
    links={[{ expenseId: 'expense-1', cardId: 'c1' }]}/>);
  fireEvent.change(screen.getByLabelText('Tarjeta registrada'), { target: { value: 'c1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar tarjeta' }));
  const card = screen.getByRole('article', { name: 'Pago planificado Banco Uno · Visa 1111' });
  expect(within(card).getByLabelText('Total del resumen ARS')).toHaveValue('777.11');
  expect(within(card).getByLabelText('Total del resumen USD')).toHaveValue('1.00');
  expect(within(card).getByLabelText('Percepción RG 5617 en ARS')).toHaveValue('');
});
