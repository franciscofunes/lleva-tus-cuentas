import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BimonetarySummary from './BimonetarySummary';

jest.mock('../services/portfolioService', () => ({
  subscribePortfolioPositions: jest.fn((uid, onData) => {
    onData([
      { currency: 'USD', balance: 2500 },
      { currency: 'ARS', balance: 35000 },
    ]);
    return () => {};
  }),
}));

const docs = [
  { category: 'Ingreso divisas', currencyQuantity: 1000 },
  { category: 'Venta divisas', currencyQuantity: 300, amount: 420000 },
  { category: 'Gasto fijo', amount: 50000 },
];
const categories = [
  { name: 'Ingreso divisas', isExpense: false },
  { name: 'Venta divisas', isExpense: false },
  { name: 'Gasto fijo', isExpense: true },
];
const renderSummary = (hideValues = false) =>
  render(<MemoryRouter><BimonetarySummary
    docs={docs} categories={categories} userId='test-user'
    isLoading={false} hideValues={hideValues}
  /></MemoryRouter>);

describe('Dashboard ARS/USD summary', () => {
  it('shows independent currencies, conversion explanations and the real portfolio link', async () => {
    renderSummary();
    expect(screen.getByLabelText('Flujo de pesos argentinos')).toHaveTextContent('Venta USD');
    expect(screen.getByLabelText('Flujo de dólares estadounidenses')).toHaveTextContent('Ingresos USD');
    expect(screen.getByLabelText('Flujo de pesos argentinos')).toHaveTextContent('Flujo neto ARS');
    expect(screen.getByText(/Un flujo ARS negativo no significa necesariamente pérdida/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Saldos actuales de Portfolio')).toHaveTextContent('Portfolio USD'));
    expect(screen.getByRole('link', { name: /Ver Portfolio/ })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('button', { name: /Ver cotizaciones del dólar/i })).toBeInTheDocument();
  });

  it('hides financial amounts both from the flows and from portfolio', async () => {
    renderSummary(true);
    await waitFor(() => expect(screen.getByLabelText('Saldos actuales de Portfolio')).toHaveTextContent('••••••'));
    expect(screen.getByLabelText('Flujo de pesos argentinos')).toHaveTextContent('••••••');
    expect(screen.queryByText(/420\.000/)).not.toBeInTheDocument();
  });
});
