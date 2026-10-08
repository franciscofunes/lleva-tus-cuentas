import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const mount = (props = {}) =>
  render(
    <MemoryRouter>
      <BimonetarySummary docs={docs} categories={categories} userId='test-user'
        isLoading={false} hideValues={false} {...props} />
    </MemoryRouter>
  );

beforeEach(() => localStorage.clear());

describe('Compact ARS/USD summary', () => {
  it('uses three matching skeleton cards instead of loading text during a period change', () => {
    mount({ isLoading: true });

    const status = screen.getByRole('status', { name: 'Cargando movimientos del período' });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('bimonetary-skeleton-card')).toHaveLength(3);
    expect(status).toHaveTextContent('Cargando los saldos en pesos, dólares y Portfolio');
    expect(status.querySelector('.motion-safe\\:animate-pulse')).toBeInTheDocument();
    expect(status.querySelector('.dark\\:bg-slate-900\\/60')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Flujo de pesos argentinos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver cotizaciones del dólar/i })).not.toBeInTheDocument();
  });

  it('replaces skeletons with live ARS/USD/Portfolio cards after loading', async () => {
    const view = mount({ isLoading: true });
    expect(screen.getAllByTestId('bimonetary-skeleton-card')).toHaveLength(3);

    view.rerender(
      <MemoryRouter>
        <BimonetarySummary docs={docs} categories={categories} userId='test-user'
          isLoading={false} hideValues={false} />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('bimonetary-loading')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Flujo de pesos argentinos' })).toHaveTextContent('370.000');
    expect(screen.getByRole('region', { name: 'Movimiento de dólares' })).toHaveTextContent('700');
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Patrimonio en Portfolio' })).toHaveTextContent('2.500')
    );
  });

  it('does not reveal portfolio amounts or red/green balance signs while loading', () => {
    mount({ isLoading: true, hideValues: true });
    const loading = screen.getByTestId('bimonetary-loading');
    expect(loading).not.toHaveTextContent('370.000');
    expect(loading).not.toHaveTextContent('2.500');
    expect(loading.querySelector('.text-rose-700')).not.toBeInTheDocument();
    expect(loading.querySelector('.text-emerald-700')).not.toBeInTheDocument();
  });

  it('shows only three main values by default and all details are collapsed', async () => {
    mount();
    const ars = screen.getByRole('region', { name: 'Flujo de pesos argentinos' });
    const usd = screen.getByRole('region', { name: 'Movimiento de dólares' });
    const portfolio = screen.getByRole('region', { name: 'Patrimonio en Portfolio' });

    expect(within(ars).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(within(usd).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(within(portfolio).getByRole('button')).toHaveAttribute('aria-expanded', 'false');

    expect(ars).toHaveTextContent('370.000');
    expect(usd).toHaveTextContent('700');
    await waitFor(() => expect(portfolio).toHaveTextContent('2.500'));
    expect(within(ars).queryByText('Ingresos ARS')).not.toBeInTheDocument();
    expect(within(usd).queryByText('Dólares vendidos')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver Portfolio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver cotizaciones del dólar/i })).not.toBeInTheDocument();
  });

  it('expands the requested currency independently with semantic colors and proper detail', () => {
    mount();
    const ars = screen.getByRole('region', { name: 'Flujo de pesos argentinos' });
    const usd = screen.getByRole('region', { name: 'Movimiento de dólares' });
    fireEvent.click(within(ars).getByRole('button'));
    expect(within(ars).getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(ars).toHaveTextContent('Venta USD');
    expect(within(ars).getByText('Gastos ARS').nextSibling).toHaveClass('text-rose-700');
    expect(within(ars).getByText('Ingresos ARS').nextSibling).toHaveClass('text-emerald-700');
    expect(within(usd).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(within(usd).getByRole('button'));
    expect(usd).toHaveTextContent('Ingresos USD');
    expect(usd).toHaveTextContent('Dólares vendidos');
    fireEvent.click(within(ars).getByRole('button'));
    expect(ars).not.toHaveTextContent('Venta USD');
  });

  it('keeps portfolio link, exchange rates and separate currencies inside its disclosure', async () => {
    mount();
    const portfolio = screen.getByRole('region', { name: 'Patrimonio en Portfolio' });
    fireEvent.click(within(portfolio).getByRole('button'));
    await waitFor(() => expect(portfolio).toHaveTextContent('Portfolio ARS'));
    expect(portfolio).toHaveTextContent('Portfolio USD');
    expect(screen.getByRole('link', { name: /Ver Portfolio/i })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('button', { name: /Ver cotizaciones del dólar/i })).toBeInTheDocument();
  });

  it('respects hidden values in summaries and details', async () => {
    mount({ hideValues: true });
    const ars = screen.getByRole('region', { name: 'Flujo de pesos argentinos' });
    const usd = screen.getByRole('region', { name: 'Movimiento de dólares' });
    const portfolio = screen.getByRole('region', { name: 'Patrimonio en Portfolio' });
    await waitFor(() => expect(portfolio).toHaveTextContent('••••••'));
    fireEvent.click(within(ars).getByRole('button'));
    fireEvent.click(within(usd).getByRole('button'));
    fireEvent.click(within(portfolio).getByRole('button'));
    expect(ars).not.toHaveTextContent('420.000');
    expect(usd).not.toHaveTextContent('1.000');
    expect(portfolio).not.toHaveTextContent('2.500');
    expect(ars).toHaveTextContent('••••••');
    expect(portfolio).toHaveTextContent('••••••');
  });

  it('remembers each users expanded preferences, not their financial values', async () => {
    const first = mount();
    const usd = screen.getByRole('region', { name: 'Movimiento de dólares' });
    fireEvent.click(within(usd).getByRole('button'));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('ltc:bimonetary:expanded:test-user')).usd).toBe(true)
    );
    first.unmount();

    mount();
    expect(within(screen.getByRole('region', { name: 'Movimiento de dólares' }))
      .getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('region', { name: 'Flujo de pesos argentinos' }))
      .getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('ltc:bimonetary:expanded:test-user')).not.toContain('2500');
  });

  it('hides the long explanation behind an optional accessible disclosure', () => {
    mount();
    expect(screen.queryByText(/Un flujo ARS negativo no significa necesariamente pérdida/i)).not.toBeInTheDocument();
    const help = screen.getByRole('button', { name: /Qué significa este resumen/i });
    fireEvent.click(help);
    expect(help).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Un flujo ARS negativo no significa necesariamente pérdida/i)).toBeInTheDocument();
    fireEvent.click(help);
    expect(help).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks negative ARS movement red without implying that it is a portfolio loss', () => {
    const negativeDocs = [{ category: 'Gasto fijo', amount: 50000 }];
    mount({ docs: negativeDocs });
    const ars = screen.getByRole('region', { name: 'Flujo de pesos argentinos' });
    expect(within(ars).getByText(/50.000/)).toHaveClass('text-rose-700');
    expect(ars).toHaveTextContent('Entradas y salidas en pesos');
  });
});
