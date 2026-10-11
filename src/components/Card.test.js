import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Card from './Card';

// Card imports an action creator; unit tests must not initialize real Firebase.
jest.mock('../shared/config/firebase/firebase.config', () => ({
  auth: { currentUser: null },
  firestore: { collection: jest.fn() },
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));
jest.mock('./CardStatementDetails', () => () => null);
jest.mock('./InfoTooltip', () => () => null);

const basicProps = {
  id: 'test-movement',
  name: 'Movimiento importado',
  amount: '1250',
  selectedDate: '2026-10-10',
};

test('missing category and categories while loading never crash a transaction card', () => {
  render(<Card {...basicProps} />);
  expect(screen.getByText('Sin categoría')).toBeInTheDocument();
  expect(screen.getByText(/1,?250/)).toBeInTheDocument();
});

test('legacy non-string category does not crash rendering', () => {
  render(<Card {...basicProps} category={{ oldValue: true }} categories={[]} />);
  expect(screen.getByText('Sin categoría')).toBeInTheDocument();
});

test('normal card still renders its expense sign when the category exists', () => {
  render(<Card {...basicProps} category='Salud' categories={[{ name: 'Salud', isExpense: true }]} />);
  expect(screen.getByText(/-1,?250/)).toBeInTheDocument();
});

test('each transaction has a readable, distinct card surface and accessible touch targets', () => {
  render(<Card {...basicProps} category='Salud' comment='Consulta médica' categories={[{ name: 'Salud', isExpense: true }]} />);
  const card = screen.getByRole('article', { name: 'Movimiento: Movimiento importado' });
  expect(card).toHaveClass('rounded-2xl', 'bg-white', 'dark:bg-slate-800', 'dark:border-slate-700', 'ltc-transaction-card');
  expect(screen.getByText('Nombre:')).toHaveClass('text-violet-700', 'dark:text-violet-200');
  expect(screen.getByText('Consulta médica')).toHaveClass('text-sm');
  const edit = screen.getByRole('button', { name: 'Editar Movimiento importado' });
  const remove = screen.getByRole('button', { name: 'Eliminar Movimiento importado' });
  expect(edit).toHaveClass('h-11', 'w-11');
  expect(remove).toHaveClass('h-11', 'w-11');
});

test('credit-card summaries retain closing and expiration dates and summary details', () => {
  render(<Card {...basicProps} category='Resumen tarjeta 💳' selectedCloseDate='2026-10-31'
    selectedExpirationDate='2026-11-13' categories={[{ name: 'Resumen tarjeta 💳', isExpense: true }]} />);
  expect(screen.getByText('Fecha de Cierre:')).toBeInTheDocument();
  expect(screen.getByText('31/10/2026')).toBeInTheDocument();
  expect(screen.getByText('Fecha de vencimiento:')).toBeInTheDocument();
  expect(screen.getByText('13/11/2026')).toBeInTheDocument();
});

test('currency purchase keeps the original quantity, exchange rate and ARS amount', () => {
  render(<Card {...basicProps} amount='158064' category='Compra divisas' currencyQuantity='100'
    currencyExchangeRate='1580.64' categories={[{ name: 'Compra divisas', isExpense: true }]} />);
  expect(screen.getByText('Cantidad:')).toBeInTheDocument();
  expect(screen.getByText('$USD 100')).toBeInTheDocument();
  expect(screen.getByText('Cotización:')).toBeInTheDocument();
  expect(screen.getByText('$AR 1580.64')).toBeInTheDocument();
  expect(screen.getByText(/-158,?064/)).toBeInTheDocument();
});

test('services with configured due dates preserve their due-date label and paid status', () => {
  render(<Card {...basicProps} category='Servicio de Internet' selectedDate='2026-10-13'
    categories={[{ name: 'Servicio de Internet', isExpense: true, dateBehavior: 'due-date' }]}
    paymentStatus='paid' paidDueDate='2026-10-13' paidAt='2026-10-12' />);
  expect(screen.getByText('Fecha de vencimiento:')).toBeInTheDocument();
  expect(screen.queryByText('Fecha transacción:')).not.toBeInTheDocument();
  expect(screen.getByText('Pagado')).toBeInTheDocument();
  expect(screen.getByText('Vencía 13/10/2026')).toBeInTheDocument();
  expect(screen.getByText('Pagado 12/10/2026')).toBeInTheDocument();
});

test('custom category metadata remains visible and readable for long entries', () => {
  render(<Card {...basicProps} category='Mi categoría personalizada' comment='Una descripción larga sin truncamiento'
    customDetails={{ reference: 'REFERENCIA-CON-IDENTIFICADOR-LARGO-123456', paymentMethod: 'transferencia' }}
    categories={[{ name: 'Mi categoría personalizada', isExpense: true }]} />);
  const card = screen.getByRole('article');
  expect(card).toHaveClass('min-w-0');
  expect(screen.getByLabelText('Datos adicionales de la transacción')).toBeInTheDocument();
  expect(screen.getByText('REFERENCIA-CON-IDENTIFICADOR-LARGO-123456')).toBeInTheDocument();
  expect(screen.getByText('Transferencia')).toBeInTheDocument();
});

test('edit action still opens the same form and restores the transaction data', () => {
  const setters = Object.fromEntries([
    'setName', 'setAmount', 'setComment', 'setCategory', 'setCustomDetails',
    'setHasSavedCustomDetails', 'setSelectedDate', 'setSelectedCloseDate',
    'setSelectedExpirationDate', 'setCurrencyQuantity', 'setCurrencyExchangeRate',
    'setIsCreditCardCategory', 'setIsBuyCurrenciesCategory', 'setIsCurrencyIncomeCategory',
    'setIsSellCurrenciesCategory', 'setExpenseId', 'setEdit', 'openModal'
  ].map((name) => [name, jest.fn()]));
  render(<Card {...basicProps} {...setters} category='Compra divisas' comment='Prueba de edición'
    customDetails={{ reference: 'ABC' }} currencyQuantity='100' currencyExchangeRate='1580.64' />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Movimiento importado' }));
  expect(setters.openModal).toHaveBeenCalledTimes(1);
  expect(setters.setName).toHaveBeenCalledWith('Movimiento importado');
  expect(setters.setCustomDetails).toHaveBeenCalledWith({ reference: 'ABC' });
  expect(setters.setCurrencyQuantity).toHaveBeenCalledWith('100');
  expect(setters.setIsBuyCurrenciesCategory).toHaveBeenCalledWith(true);
  expect(setters.setEdit).toHaveBeenCalledWith(true);
});

test('dark transactions use opaque slate surfaces and readable semantic text in every row', () => {
  const { container } = render(<Card {...basicProps} category='Servicio de Internet'
    selectedCloseDate='2026-10-31' selectedExpirationDate='2026-11-13'
    comment='Descripción de un servicio' paymentStatus='paid'
    customDetails={{ reference: 'ABC123' }}
    categories={[{ name: 'Servicio de Internet', isExpense: true, dateBehavior: 'due-date' }]} />);
  const card = container.querySelector('.ltc-transaction-card');
  expect(card).toHaveClass('dark:bg-slate-800', 'dark:border-slate-700');
  expect(card).not.toHaveClass('bg-slate-50/80', 'dark:bg-slate-900/45');
  expect(screen.getByText('Nombre:')).toHaveClass('dark:text-violet-200');
  expect(screen.getByText('Descripción de un servicio')).toHaveClass('dark:text-slate-200');
  expect(screen.getByLabelText('Datos adicionales de la transacción'))
    .toHaveClass('dark:bg-slate-900/70', 'dark:text-slate-200');
  expect(Array.from(card.querySelectorAll('p')).filter((row) => row.className.includes('dark:text-slate-200')).length).toBeGreaterThan(2);
});

test('real html.dark theme selector enforces the opaque card background at CSS level', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
  const fallback = css.match(/html\.dark\s+\.ltc-transaction-card\s*\{[^}]+\}/)?.[0];
  expect(fallback).toBeTruthy();
  const style = document.createElement('style');
  style.textContent = fallback;
  document.head.appendChild(style);
  document.documentElement.classList.add('dark');
  try {
    render(<Card {...basicProps} />);
    const card = screen.getByRole('article');
    expect(getComputedStyle(card).backgroundColor).toBe('rgb(30, 41, 59)');
    expect(getComputedStyle(card).color).toBe('rgb(248, 250, 252)');
  } finally {
    style.remove();
    document.documentElement.classList.remove('dark');
  }
});

test('new due-date categories display transaction and optional expiration dates independently', () => {
  const category = { name: 'Alquiler comercial', isExpense: true, dateBehavior: 'separate-due-date' };
  render(<Card {...basicProps} category={category.name} categories={[category]}
    selectedDate='2026-10-10' selectedExpirationDate='2026-10-20' />);
  expect(screen.getByText(/Fecha transacción/)).toBeInTheDocument();
  expect(screen.getByText(/Fecha de vencimiento:/)).toBeInTheDocument();
  expect(screen.getByText('10/10/2026')).toBeInTheDocument();
  expect(screen.getByText('20/10/2026')).toBeInTheDocument();
});

test('new due-date category without an optional expiration has no placeholder or invalid date', () => {
  const category = { name: 'Alquiler comercial', isExpense: true, dateBehavior: 'separate-due-date' };
  render(<Card {...basicProps} category={category.name} categories={[category]}
    selectedDate='2026-10-10' selectedExpirationDate='' />);
  expect(screen.getByText(/Fecha transacción/)).toBeInTheDocument();
  expect(screen.queryByText(/Fecha de vencimiento:/)).not.toBeInTheDocument();
  expect(screen.queryByText('Invalid date')).not.toBeInTheDocument();
});
