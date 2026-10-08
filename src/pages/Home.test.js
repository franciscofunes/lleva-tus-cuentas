import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

let mockCurrentUser = null;

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ auth: { user: mockCurrentUser } }),
}));

const renderHome = () => render(
  <MemoryRouter><Home /></MemoryRouter>
);

describe('LTC landing', () => {
  beforeEach(() => { mockCurrentUser = null; });

  it('presents LITA AI and sends guests to signup', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Entendé tu dinero');
    expect(screen.getByRole('heading', { name: 'Tus números también pueden darte respuestas.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Empezar ahora/i })).toHaveAttribute('href', '/registrarse');
    expect(screen.getByRole('link', { name: /Conocé a LITA/i })).toHaveAttribute('href', '#conoce-lita');
    expect(screen.getByText('Vista ilustrativa')).toBeInTheDocument();
    expect(screen.getByText('¿En qué categorías estoy gastando más?')).toBeInTheDocument();
    expect(screen.getByText(/LITA no reemplaza asesoramiento financiero profesional/i)).toBeInTheDocument();
  });

  it('sends authenticated users to transactions without losing the AI explanation', () => {
    mockCurrentUser = { uid: 'example-user' };
    renderHome();
    expect(screen.getByRole('link', { name: /Ir a mis movimientos/i })).toHaveAttribute('href', '/transacciones');
    expect(screen.getByRole('link', { name: /Abrir Lleva Tus Cuentas/i })).toHaveAttribute('href', '/transacciones');
    expect(screen.getByRole('heading', { name: 'Tus números también pueden darte respuestas.' })).toBeInTheDocument();
  });

  it('keeps LITA readable in light mode and matches the shared dark page palette', () => {
    const { container } = renderHome();
    const main = container.querySelector('main');
    const lita = container.querySelector('#conoce-lita');

    expect(main).toHaveClass('bg-slate-50', 'dark:bg-gray-900');
    expect(lita).toHaveClass('bg-white', 'text-slate-900', 'dark:bg-gray-900', 'dark:text-slate-100');
    expect(lita).not.toHaveClass('bg-slate-950', 'text-white');

    const panel = screen.getByText('Preguntale a LITA').closest('.rounded-3xl');
    expect(panel).toHaveClass('bg-slate-50', 'dark:bg-slate-800');
    expect(screen.getByRole('link', { name: /Empezar a usar LTC/i }))
      .toHaveClass('bg-purple-600', 'text-white');
    expect(screen.getByRole('contentinfo')).toHaveClass('dark:bg-gray-900');
  });

  it('does not present decorative sample charts as real account balances', () => {
    renderHome();
    expect(screen.getByText('Vista ilustrativa')).toBeInTheDocument();
    expect(screen.queryByText(/ganancias garantizadas/i)).not.toBeInTheDocument();
  });
});
