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

  it('does not present decorative sample charts as real account balances', () => {
    renderHome();
    expect(screen.getByText('Vista ilustrativa')).toBeInTheDocument();
    expect(screen.queryByText(/ganancias garantizadas/i)).not.toBeInTheDocument();
  });
});
