import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, useNavigate } from 'react-router-dom';
import AnimatedRoutes, { getNavigationTransition } from './AnimatedRoutes';

function Links() {
  const navigate = useNavigate();
  return (
    <nav>
      <button onClick={() => navigate('/portfolio')}>Portfolio</button>
      <button onClick={() => navigate('/transacciones')}>Transacciones</button>
    </nav>
  );
}

test('financial navigation has a matching exit and entry with reduced-motion fallback', () => {
  expect(getNavigationTransition(false)).toEqual({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18, ease: 'easeOut' },
  });
  expect(getNavigationTransition(true).transition.duration).toBe(0);
  expect(getNavigationTransition(false).animate).not.toHaveProperty('x');
});

test('switches route content with the same transition wrapper and stable navigation controls', async () => {
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
    });
  }
  render(
    <MemoryRouter initialEntries={['/transacciones']}>
      <Links />
      <AnimatedRoutes>
        <Route path='/transacciones' element={<h1>Transacciones</h1>} />
        <Route path='/portfolio' element={<h1>Portfolio de prueba</h1>} />
      </AnimatedRoutes>
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { name: 'Transacciones' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Portfolio' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Portfolio de prueba' })).toBeInTheDocument(), { timeout: 3000 });
});

test('quick access navigation from Portfolio to Transacciones mounts next route without awaiting exit', () => {
  render(
    <MemoryRouter initialEntries={['/portfolio']}>
      <Links />
      <AnimatedRoutes>
        <Route path='/portfolio' element={<h1>Cuentas e inversiones</h1>} />
        <Route path='/transacciones' element={<h1>Resumen financiero</h1>} />
      </AnimatedRoutes>
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { name: 'Cuentas e inversiones' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Transacciones' }));
  // Previously mode="wait" could leave this screen blank until an exit
  // animation completes; a route change must mount its page immediately.
  expect(screen.getByRole('heading', { name: 'Resumen financiero' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Portfolio' }));
  expect(screen.getByRole('heading', { name: 'Cuentas e inversiones' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Transacciones' }));
  expect(screen.getByRole('heading', { name: 'Resumen financiero' })).toBeInTheDocument();
});
