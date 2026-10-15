import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import FinancialPageLayout from './FinancialPageLayout';

function Nav() {
  const navigate = useNavigate();
  return <nav>
    <button onClick={() => navigate('/transacciones')}>Movimientos</button>
    <button onClick={() => navigate('/portfolio')}>Posiciones</button>
    <button onClick={() => navigate('/portfolio/123')}>Detalle</button>
    <button onClick={() => navigate('/bancos')}>Bancos</button>
    <button onClick={() => navigate('/ingresar')}>Login</button>
  </nav>;
}

test('transactions, portfolio, portfolio detail and banks reuse exactly one shared full footer', () => {
  render(<MemoryRouter initialEntries={['/bancos']}>
    <Nav />
    <Routes>
      <Route element={<FinancialPageLayout />}>
        <Route path='/transacciones' element={<main>Contenido transacciones</main>} />
        <Route path='/portfolio' element={<main>Contenido portfolio</main>} />
        <Route path='/portfolio/:positionId' element={<main>Detalle del portfolio</main>} />
        <Route path='/bancos' element={<main>Bancos y tarjetas</main>} />
      </Route>
      <Route path='/ingresar' element={<main>Ingreso</main>} />
    </Routes>
  </MemoryRouter>);
  for (const name of ['Movimientos', 'Posiciones', 'Detalle', 'Bancos']) {
    fireEvent.click(screen.getByRole('button', { name }));
    expect(screen.getAllByRole('contentinfo', { name:'Pie de página' })).toHaveLength(1);
    expect(screen.getByText('Tus finanzas, en un solo lugar.')).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name:'Login' }));
  expect(screen.queryByRole('contentinfo', { name:'Pie de página' })).not.toBeInTheDocument();
});

test('shared footer stays outside the route-specific content', () => {
  render(<MemoryRouter initialEntries={['/bancos']}>
    <Routes>
      <Route element={<FinancialPageLayout />}>
        <Route path='/bancos' element={<main data-testid='banks-content'>Banco del usuario</main>} />
      </Route>
    </Routes>
  </MemoryRouter>);
  expect(screen.getByTestId('banks-content').contains(screen.getByRole('contentinfo'))).toBe(false);
});
