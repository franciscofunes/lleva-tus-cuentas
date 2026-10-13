import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BankStatementSelector from './BankStatementSelector';
import {
  subscribeBanks, subscribeBankCards, getStatementLink,
} from '../services/bankingService';

jest.mock('../services/bankingService', () => ({
  subscribeBanks: jest.fn((uid, onData) => {
    onData([{ code:'santander', name:'Banco Santander', active:true },
      { code:'ciudad', name:'Banco Ciudad', active:true }]);
    return jest.fn();
  }),
  subscribeBankCards: jest.fn((uid, onData) => {
    onData([{ id:'visa',bankId:'santander',nickname:'Visa Gold',lastFour:'1234' },
      { id:'cityvisa',bankId:'ciudad',nickname:'Visa Ciudad',lastFour:'4321' }]);
    return jest.fn();
  }),
  getStatementLink: jest.fn(),
}));

function Form({ expenseId = null }) {
  const [bank, setBank] = useState('');
  const [card, setCard] = useState('');
  return <MemoryRouter>
    <BankStatementSelector uid='alice' expenseId={expenseId} bankId={bank} cardId={card}
      onBankChange={setBank} onCardChange={setCard}/>
    <output data-testid='link'>{bank + '/' + card}</output>
  </MemoryRouter>;
}

beforeEach(() => {
  jest.clearAllMocks();
  getStatementLink.mockResolvedValue(null);
  subscribeBanks.mockImplementation((uid, onData) => {
    onData([{ code:'santander', name:'Banco Santander', active:true }, { code:'ciudad', name:'Banco Ciudad', active:true }]);
    return jest.fn();
  });
  subscribeBankCards.mockImplementation((uid, onData) => {
    onData([{ id:'visa',bankId:'santander',nickname:'Visa Gold',lastFour:'1234' },
      { id:'cityvisa',bankId:'ciudad',nickname:'Visa Ciudad',lastFour:'4321' }]);
    return jest.fn();
  });
});

test('a summary can remain unlinked and category/amount is not changed', () => {
  render(<Form/>);
  expect(screen.getByLabelText('Banco del resumen')).toHaveValue('');
  expect(screen.getByLabelText('Tarjeta del resumen')).toBeDisabled();
  expect(screen.getByText(/sin registrar de nuevo/)).toBeInTheDocument();
});

test('selecting bank filters cards to its institution, changing bank resets card', () => {
  render(<Form/>);
  fireEvent.change(screen.getByLabelText('Banco del resumen'), { target:{value:'santander'} });
  expect(screen.getByRole('option', { name:/Visa Gold/ })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name:/Visa Ciudad/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tarjeta del resumen'), { target:{value:'visa'} });
  expect(screen.getByTestId('link')).toHaveTextContent('santander/visa');
  fireEvent.change(screen.getByLabelText('Banco del resumen'), { target:{value:'ciudad'} });
  expect(screen.getByTestId('link')).toHaveTextContent('ciudad/');
  expect(screen.queryByRole('option', { name:/Visa Gold/ })).not.toBeInTheDocument();
});

test('existing summary rehydrates owner link without changing stored transaction', async () => {
  getStatementLink.mockResolvedValue({ expenseId:'e1',bankId:'ciudad',cardId:'cityvisa' });
  render(<Form expenseId='e1'/>);
  await waitFor(() => expect(screen.getByTestId('link')).toHaveTextContent('ciudad/cityvisa'));
  expect(getStatementLink).toHaveBeenCalledWith('alice','e1');
  expect(subscribeBanks).toHaveBeenCalledWith('alice',expect.any(Function),expect.any(Function));
  expect(subscribeBankCards).toHaveBeenCalledWith('alice',expect.any(Function),expect.any(Function));
});
